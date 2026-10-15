# ZETE
## <b>A. INTRODUCTION</b>

ZETE is an enhanced fuzzy commitment scheme that utilizes a zero-knowledge (zk) proof.

<b>It comprises 3 application servers:</b>

<b>1.</b> Laravel 12 Web Application server – For UI and interfacing with users

<b>2.</b> Python Application server – For Face recognition (using AdaFace <a href="#ref1">[1]</a>), Error Correction (using LDPC <a href="#ref2">[2]</a>/SPA <a href="#ref3">[3]</a>) and interfacing the Web application with the Go ZK application

<b>3.</b> Go ZK Application server– For generating and verifying zk proofs (using GNARK <a href="#ref4">[4]</a>).

## <b>B. PREREQUISITE</b>

<b>1.</b> Laravel 12

<b>2.</b> Conda 25.7

<b>3.</b> Go 1.26.1

## <b>C. PREINSTALLATION INSTRUCTIONS</b>

<b>1.</b> See <a href="https://laravel.com/framework/docs/12.x/installation">instructions on how to setup Composer and Laravel 12</a>

<b>2.</b> See <a href="https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html">instructions on how to install and setup Conda</a>

<b>3.</b> See <a href="https://go.dev/doc/install">instructions on how to install and setup Go</a>

<b>4.</b> Download pretrained Adaface model <a href="https://huggingface.co/minchul/cvlface_adaface_ir101_webface12m">here</a>

<b>5.</b> Create new folder named "pretrained" in the folder "zete/adaface/"

	cd zete/adaface
	
	mkdir pretrained

<b>6.</b> Copy the downloaded model into the "pretrained" folder

## <b>D. INSTALLATION INSTRUCTIONS</b>

<b>1.</b> Run the Laravel Web Application
   
	cd zete

	php artisan serve

<b>2.</b> Install and Run Python Application Server
   
	cd zete/adaface

	conda create --name adaface python=3.8.18 -y

	conda activate adaface

	pip install -r requirements.txt

	uvicorn api:app --host 127.0.0.1 --port 7000

<b>3.</b> Run Go ZK Application Server 

	cd zete/zk

	go run .

## References

<span id="ref1">M. Kim, A. K. Jain, and X. Liu, "AdaFace: Quality adaptive margin for face recognition," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), New Orleans, LA, USA, 2022, pp. 18729--18738, https://doi.org/10.1109/CVPR52688.2022.01819. </span>

<span id="ref2">R. Gallager, ``Low-density parity-check codes,'' IRE Trans. Inf. Theory, vol. 8, no. 1, pp. 21--28, Jan. 1962, https://10.1109/TIT.1962.1057683. </span>

<span id="ref3">F. R. Kschischang, B. J. Frey, and H.-A. Loeliger, "Factor graphs and the sum-product algorithm," IEEE Trans. Inf. Theory, vol. 47, no. 2, pp. 498--519, Feb. 2001, https://doi.org/10.1109/18.910572.</span>

<span id="ref4">GNARK API Documentation, https://docs.gnark.consensys.io/Reference/api.</span>

## License & Usage

Copyright (c) 2026 Udochukwu C. Enwerem. All rights reserved.

This repository and its source code are strictly for educational/viewing purposes. 
Commercial use, reproduction, or redistribution without prior written consent is strictly prohibited.