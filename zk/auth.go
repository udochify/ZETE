package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"log"
	"strings"

	"net/http"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark-crypto/ecc/bn254/fr"
	mimc2 "github.com/consensys/gnark-crypto/ecc/bn254/fr/mimc"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs/r1cs"
	"github.com/consensys/gnark/std/hash/mimc"
	"github.com/gin-gonic/gin"
)

func bitsToHex(bits []string) string {
	var sb strings.Builder

	// Left-pad to multiple of 4
	for len(bits)%4 != 0 {
		bits = append([]string{"0"}, bits...)
	}

	for i := 0; i < len(bits); i += 4 {
		val := 0
		for j := 0; j < 4; j++ {
			val <<= 1
			if bits[i+j] == "1" {
				val |= 1
			}
		}
		sb.WriteString(fmt.Sprintf("%X", val))
	}

	return "0x" + sb.String()
}

// Elliptic Curve Algorithm to be used for creating hashes
const CurveID ecc.ID = ecc.BN254

// struct defining our circuit
type Circuit struct {
	PreImage frontend.Variable
	Hash     frontend.Variable `gnark:",public"`
}

// Create a Define method for our struct to be used internally by gnark for compiling circuits
func (circuit *Circuit) Define(api frontend.API) error {
	// new mimc implementation used for creating hashes within a circuit
	mimc, err := mimc.NewMiMC(api)
	if err != nil {
		log.Fatal(err)
	}

	// write a circuit data to hasher
	mimc.Write(circuit.PreImage)

	// check that the computed hash is same as the hash provided in the circuit
	api.AssertIsEqual(circuit.Hash, mimc.Sum())
	return nil
}

// Implementation of the MiMC(Minimal Inversion Multiplicative Cipher) for creating hashes in a finite field.
// it is important that content is of the appropropriate number format.
// prepend string with "0o" for Octal and "0x" for hexadecimal numbers.
// if no format indicating string is prepended, a decimal number assumed.
func cryptoHash(content string) string {
	// new mimc implementation from gnark-crypto for creating hashes outside a circuit
	mimc := mimc2.NewMiMC()

	// finite field element for storing the iput to be hashed
	var inFr fr.Element

	// finite field element for storing output hash
	var outFr fr.Element

	// set the content of inFr to the string to be hashed.
	inFr.SetString(content)

	// write the data to be hash using the appropriate byte slice format
	mimc.Write(inFr.Marshal())

	// compute the hash
	hash := mimc.Sum(nil)

	// set the content of outFr to the computed hash result
	outFr.SetBytes(hash)

	// return the hash in decimal format for easy interpretation.
	// this is the circuit compatible format
	return outFr.String()
}

// Define the structure of the incoming data
type APIRequest struct {
	Codeword []string `json:"codeword"`
	Proof    string   `json:"proof"`
	Vk       string   `json:"vk"`
}

func main() {
	r := gin.Default()

	r.POST("/generate-proof", func(c *gin.Context) {
		var req APIRequest

		// ShouldBindJSON is the Go equivalent of FastAPI's Pydantic validation
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": err.Error(),
			})
			return
		}

		enroll_hex := bitsToHex(req.Codeword)

		enroll_circuit := Circuit{
			PreImage: enroll_hex,
			Hash:     cryptoHash(enroll_hex),
		}

		enroll_witness, _ := frontend.NewWitness(&enroll_circuit, CurveID.ScalarField())
		r1cs, err := frontend.Compile(CurveID.ScalarField(), r1cs.NewBuilder, &enroll_circuit)

		if err != nil {
			log.Fatal(err)
		}

		// setup gnark with groth16 snark protocol and derive
		// the crypto keys for generating and verifying proofs
		pk, vk, err := groth16.Setup(r1cs)

		if err != nil {
			log.Fatal(err)
		}
		// generate a proof
		proof, err := groth16.Prove(r1cs, pk, enroll_witness)

		// serialize vk and proof to bytes buffer
		var vkBuf bytes.Buffer
		var proofBuf bytes.Buffer
		if _, err := vk.WriteTo(&vkBuf); err != nil {
			log.Fatal(err)
		}
		if _, err := proof.WriteTo(&proofBuf); err != nil {
			log.Fatal(err)
		}

		ProofData := base64.StdEncoding.EncodeToString(proofBuf.Bytes())
		VerificationKey := base64.StdEncoding.EncodeToString(vkBuf.Bytes())

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"proof":   ProofData,
			"vk":      VerificationKey,
			"message": "Image processed successfully.\nContinue with registration",
		})
	})

	r.POST("/verify-proof", func(c *gin.Context) {
		var req APIRequest

		// ShouldBindJSON is the Go equivalent of FastAPI's Pydantic validation
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": err.Error(),
			})
			return
		}

		auth_hex := bitsToHex(req.Codeword)

		auth_circuit := Circuit{
			PreImage: auth_hex,
			Hash:     cryptoHash(auth_hex),
		}

		auth_witness, _ := frontend.NewWitness(&auth_circuit, CurveID.ScalarField())
		publicWitness, _ := auth_witness.Public()

		// read and decode proof from json
		proofBytes, err := base64.StdEncoding.DecodeString(req.Proof)
		if err != nil {
			log.Fatal(err)
		}
		// Deserialize binary data back into a groth16.Proof object
		proof := groth16.NewProof(CurveID)
		if _, err := proof.ReadFrom(bytes.NewReader(proofBytes)); err != nil {
			log.Fatal(err)
		}

		// read and decode verification key from json
		verificationKeyBytes, err := base64.StdEncoding.DecodeString(req.Vk)
		if err != nil {
			log.Fatal(err)
		}
		// Deserialize binary data back into a groth16.VerifyingKey object
		verificationKey := groth16.NewVerifyingKey(CurveID)
		if _, err := verificationKey.ReadFrom(bytes.NewReader(verificationKeyBytes)); err != nil {
			log.Fatal(err)
		}

		if err := groth16.Verify(proof, verificationKey, publicWitness); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status":  "error",
				"message": "Image verification failed",
			})
		} else {
			c.JSON(http.StatusOK, gin.H{
				"status":  "success",
				"message": "Image verified successfully",
			})
		}
	})

	r.Run(":6000") // Run on a different port than FastAPI
}
