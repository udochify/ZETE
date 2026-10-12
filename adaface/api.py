import base64

import torch
import httpx
import json
import secrets
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import numpy as np
import io
from PIL import Image
from inference import load_pretrained_model_gpu, to_input_gpu
from face_alignment import align

# This dictionary acts as our persistent memory
models = {}

def extract(img):
    # 2. Use the persistent model
    aligned_rgb_img = align.get_aligned_face(img)
    bgr_input = to_input_gpu(aligned_rgb_img)
    with torch.no_grad():
        features, _ = models["adaface"](bgr_input.unsqueeze(0))

    features_float = features.cpu().detach().numpy()[0]

    intervals = [-0.029653941607508893518740933359367772936820983886719, 0.0001460583924909261699376372689584968611598014831543, 0.030046058392490922195339209110898082144558429718018]
    
    features_binary = binarize(features_float, intervals)

    return features_binary

def binarize(features, interval):
    dimension = len(features)
    lkut = np.zeros((len(interval)+1,len(interval))) 
    for i in range(1,len(interval)+1):
        lkut[i,len(interval)-i:] = 1
    new_data = np.zeros(dimension*len(interval))
    # print(f"new_data shape: {new_data.shape}")
    # exit()
    for i in range(len(features)):
        # print(interval>features[i],features[i])
        index = -1
        whereindex = np.where(interval>features[i])
        if len(whereindex[0]) != 0:
            index = whereindex[0][0]
        # print(index,embeddings_o[0,i], np.where(interval>embeddings_o[0,i]),interval>embeddings_o[0,i])
        new_data[i*len(interval):(i+1)*len(interval)] = lkut[index]
    return new_data

def generate_key(code_rate, n=1536):
    """
    Generate random information bits for a given coding rate.

    Parameters:
        code_rate (float): Coding rate R = k / n, must satisfy 0 < R < 1
        n (int): Codeword length (fixed to 1536 by default)

    Returns:
        info_bits (np.ndarray): Random information bits of length k
        k (int): Number of information bits
    """
    if not (0 < code_rate < 1):
        raise ValueError("Coding rate must be between 0 and 1")

    k = int(round(code_rate * n))
    # print(f"Generated key of length {k} for code rate {code_rate}")

    if k >= n:
        raise ValueError("Information length must be strictly less than codeword length")

    key = np.fromiter(
        (secrets.randbits(1) for _ in range(k)),
        dtype=np.uint8,
        count=k
    )

    return key

# -----------------------------
# Encoding for H = [A | I]
# -----------------------------
def ldpc_encode(H, u):
    """
    H is m x n with structure [A|I].
    u has length k = n-m.
    parity p = A u (mod2)
    codeword c = [u | p]
    """
    m, n = H.shape
    k = n - m
    u = np.array(u, dtype=np.uint8).reshape(-1)
    if u.size != k:
        raise ValueError(f"u must be length {k}")

    A = H[:, :k]
    p = (A @ u) & 1
    c = np.concatenate([u, p]).astype(np.uint8)

    # sanity check
    syn = (H @ c) & 1
    if np.any(syn):
        raise RuntimeError("Encoding failed: H*c != 0")
    return c

def llr_bsc(y, flip_prob):
    """
    LLR = log(P(x=0|y)/P(x=1|y)) for BSC with hard y.
    L0 = log((1-p)/p). LLR = +L0 if y=0 else -L0.
    """
    p = flip_prob
    if not (0.0 < p < 0.5):
        raise ValueError("flip_prob must be in (0, 0.5)")
    L0 = np.log((1 - p) / p)
    return L0 * (1.0 - 2.0 * y.astype(np.float64))

# -----------------------------
# Build systematic LDPC H = [A | I]
# -----------------------------
def build_systematic_ldpc_H(k=512, m=512, col_wt=3, seed=0):
    """
    Construct H = [A | I_m] where A is m x k sparse (col_wt ones per column).
    This is not (j,k)-regular overall (because of the identity part), but it is a valid LDPC
    parity-check matrix and encodes/decodes cleanly.

    Greedy balancing is used to keep row degrees of A roughly even.
    """
    rng = np.random.default_rng(seed)
    A = np.zeros((m, k), dtype=np.uint8)
    row_deg = np.zeros(m, dtype=int)

    for col in range(k):
        # pick from the rows with smallest current degree (helps balance)
        min_deg = row_deg.min()
        candidates = np.where(row_deg == min_deg)[0]

        # if not enough candidates at min degree, widen the pool
        pool = candidates
        while pool.size < col_wt:
            thresh = min_deg + 1
            pool = np.where(row_deg <= thresh)[0]
            min_deg = thresh

        chosen = rng.choice(pool, size=col_wt, replace=False)
        A[chosen, col] = 1
        row_deg[chosen] += 1

    I = np.eye(m, dtype=np.uint8)
    H = np.concatenate([A, I], axis=1)  # m x (k+m)
    # print(f"H is {H.shape}")
    return H

# -----------------------------
# Sum-product decoding (LLR domain)
# -----------------------------
def build_adj(H):
    m, n = H.shape
    check_to_vars = [np.where(H[j] == 1)[0] for j in range(m)]
    var_to_checks = [[] for _ in range(n)]
    for j, vs in enumerate(check_to_vars):
        for i in vs:
            var_to_checks[i].append(j)
    var_to_checks = [np.array(lst, dtype=int) for lst in var_to_checks]
    return check_to_vars, var_to_checks

def ldpc_sum_product_decode(H, llr_chan, max_iters=60, clip=20.0):
    """
    Standard sum-product (belief propagation) in LLR domain.
    Returns decoded_bits, success, iters_used.
    """
    H = H.astype(np.uint8)
    m, n = H.shape
    llr_chan = np.array(llr_chan, dtype=np.float64).reshape(-1)
    if llr_chan.size != n:
        raise ValueError("llr_chan length mismatch")

    check_to_vars, var_to_checks = build_adj(H)

    # messages v->c and c->v stored per check aligned to check_to_vars[j]
    v2c = [llr_chan[vs].copy() for vs in check_to_vars]
    c2v = [np.zeros_like(v2c_j) for v2c_j in v2c]

    def syndrome(bits):
        return (H @ bits) & 1

    def hard(llr):
        return (llr < 0).astype(np.uint8)

    # helper to find index of variable i in check j neighbor list (fast enough for this size)
    # for speed you’d precompute, but keep it simple here
    for it in range(1, max_iters + 1):
        # check update
        for j in range(m):
            msgs = np.clip(v2c[j], -clip, clip)
            x = np.tanh(msgs / 2.0)
            total = np.prod(x)
            for idx in range(x.size):
                xi = x[idx]
                if abs(xi) < 1e-15:
                    prod_excl = 1.0
                    for t in range(x.size):
                        if t != idx:
                            prod_excl *= x[t]
                else:
                    prod_excl = total / xi
                prod_excl = np.clip(prod_excl, -0.999999999999, 0.999999999999)
                c2v[j][idx] = 2.0 * np.arctanh(prod_excl)

        # posterior LLR
        post = llr_chan.copy()
        for i in range(n):
            for j in var_to_checks[i]:
                pos = np.where(check_to_vars[j] == i)[0][0]
                post[i] += c2v[j][pos]

        bits_hat = hard(post)
        if np.all(syndrome(bits_hat) == 0):
            return bits_hat, True, it

        # variable update (extrinsic)
        for j in range(m):
            vs = check_to_vars[j]
            for idx, i in enumerate(vs):
                msg = llr_chan[i]
                for j2 in var_to_checks[i]:
                    if j2 == j:
                        continue
                    pos2 = np.where(check_to_vars[j2] == i)[0][0]
                    msg += c2v[j2][pos2]
                v2c[j][idx] = np.clip(msg, -clip, clip)

    bits_hat = hard(post)
    return bits_hat, False, max_iters

def gen_codeword_and_offset(features, code_rate=0.02):
    n = len(features)
    k = int(round(code_rate * n))
    H = build_systematic_ldpc_H(k=k, m=n-k, col_wt=35, seed=0)
    key = generate_key(code_rate, n)
    # codeword and offset
    key_encoded = ldpc_encode(H, key)
    delta = np.logical_xor(key_encoded, features) * 1
    return key_encoded, delta

def decode(features, offset, code_rate=0.02, pflip=0.2):
    rec = np.logical_xor(offset, features) * 1
    n = len(features)
    k = int(round(code_rate * n))
    H = build_systematic_ldpc_H(k=k, m=n-k, col_wt=35, seed=0)
    llr = llr_bsc(rec, pflip)
    decoded, _, _ = ldpc_sum_product_decode(H, llr, max_iters=50)
    return decoded

def encode_offset(arr: np.ndarray) -> str:
  """Encodes a 1536-element binary array into a form-safe Base64 string."""
  if len(arr) != 1536:
    raise ValueError("Array length must be exactly 1536.")

  packed = np.packbits(arr)
  return base64.urlsafe_b64encode(packed).decode("utf-8")

def decode_offset(key_str: str) -> np.ndarray:
  """Decodes a form-submitted key string back into the binary numpy array."""
  # Clean up any accidental spaces or newlines introduced by copy-pasting into a form
  cleaned_str = key_str.strip()

  byte_data = base64.urlsafe_b64decode(cleaned_str)
  packed = np.frombuffer(byte_data, dtype=np.uint8)
  return np.unpackbits(packed).astype(np.int64)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup: Load model once ---
    print("Loading AdaFace model into memory...")
    # model = load_adaface_model('weights.ckpt') 
    # model.eval().to('cuda') # or 'cpu'
    # models["adaface"] = model
    models["adaface"] = load_pretrained_model_gpu("ir_101")
    yield
    # --- Shutdown: Clean up ---
    models.clear()

app = FastAPI(lifespan=lifespan)

@app.post("/enroll")
async def enroll(file: UploadFile = File(...)):
    try:
        # 1. Read the image from Laravel
        image = await file.read()
        
        # 2. Use the persistent model to extract features
        features_binary = extract(io.BytesIO(image))

        codeword, offset = gen_codeword_and_offset(features_binary)

        encoded_offset = encode_offset(offset)

        codeword_binary = list(map(str, codeword))

        # Prepare the payload
        payload = { "codeword": codeword_binary }

        extra_data = {"encoded_offset": encoded_offset }

        # After getting binary_features from LDPC:
        async with httpx.AsyncClient() as client:
            # FastAPI sends this as application/json automatically
            response = await client.post("http://127.0.0.1:6000/generate-proof", json=payload)

        go_response = response.json()
        go_response.update(extra_data)

        return go_response
    
    except Exception as e:
        # Catch-all for other errors (like corrupted image files)
        return JSONResponse(
            status_code=200, 
            content={"status": "error", "message": str(e)}
        )
    
@app.post("/authenticate")
async def authenticate(
    file: UploadFile = File(...), 
    proof: str = Form(...),
    vk: str = Form(...),
    offset: str = Form(...)
):
    try:
        # 1. Read the image from Laravel
        image = await file.read()

        features_binary = extract(io.BytesIO(image))

        offset_binary = decode_offset(offset)

        print("Authenticate endpoint received................................")

        decoded_codeword = decode(features_binary, offset_binary)
        codeword_binary = list(map(str, decoded_codeword))

        # Prepare the payload
        payload = { 
            "codeword": codeword_binary,
            "proof": proof,
            "vk": vk,
        }

        # After decoding codeword:
        async with httpx.AsyncClient() as client:
            # FastAPI sends this as application/json automatically
            response = await client.post("http://127.0.0.1:6000/verify-proof", json=payload)

        return response.json()
    
    except Exception as e:
        # Catch-all for other errors (like corrupted image files)
        return JSONResponse(
            status_code=200, 
            content={"status": "error", "message": str(e)}
        )