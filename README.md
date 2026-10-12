# ZETE
ZETE is an enhanced fuzzy commitment scheme that utilizes a zero-knowledge (zk) proof.

<b>It comprises 3 applications:</b>

<b>1.</b> Laravel 12 Web Application – For UI and interfacing with users

<b>2.</b> Python Application – For Face recognition and interfacing the Web application with the Go ZK application

<b>3.</b> Go ZK Application – For generating and verifying zk proofs.

<b>Prerequisite</b>

<b>1.</b> Laravel 12

<b>2.</b> Conda 25.7

<b>3.</b> Go 1.26.1

<b>Preinstallation Instruction</b>

<b>1.</b> See <a href="https://laravel.com/framework/docs/12.x/installation">instructions on how to setup Composer and Laravel 12</a>

<b>2.</b> See <a href="https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html">instructions on how to install and setup Conda</a>

<b>3.</b> See <a href="https://go.dev/doc/install">instructions on how to install and setup Go</a>

<b>4.</b> Download pretrained Adaface model <a href="https://huggingface.co/minchul/cvlface_adaface_ir101_webface12m">here</a>

<b>5.</b> Create new folder named "pretrained" in the folder "zete/adaface/"

	cd zete/adaface
	
	mkdir pretrained

<b>6.</b> Copy the downloaded model into the "pretrained" folder

<b>Installation Instructions:</b>

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
