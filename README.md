# ZETE
ZETE is an enhanced fuzzy commitment scheme that utilizes a zero- knowledge proof.

<b>It comprises 3 applications:</b>

<b>1.</b> ZETE Laravel Web Application – For UI and interfacing with users

<b>2.</b> Python Application – For Face recognition and interfacing the Web application with the Go ZK application

<b>3.</b> Go ZK Application – For generating and verifying proofs.

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
