<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;

class CameraAuthenticateController extends Controller
{
    public function store(Request $request)
    {   
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        if ($request->hasFile('image')) {
            // 0. Store the file in the 'public/uploads' directory
            // $path = $request->file('image')->store('uploads', 'public');
            // return response()->json([
            //     'message' => 'Image saved!',
            //     'path' => Storage::url($path)
            // ], 200);

            // 1. Get the file from the request
            $file = $request->file('image');

            // 2. Forward it to FastAPI
            $response = Http::attach(
                'file', 
                file_get_contents($file), 
                'image.jpg'
            )->post('http://127.0.0.1:7000/authenticate');


            if ($response->successful()) {
                $result = $response->json();

                // Store the data in the session
                if (isset($result['status']) && $result['status'] === "success") {
                    session([
                        'temp_proof' => $result['proof'],
                        'temp_vk'    => $result['vk'],
                        'temp_offset'=> $result['offset'],
                    ]);

                    // If it was actually successful
                    return response()->json([
                        'status' => $result['status'],
                        'message' => $result['message'],
                    ]);
                } else {
                    // If it was not successful
                    return response()->json([
                        'status' => "error",
                        'message' => "Error: Image was not processed.\nTry again!"
                    ]);
                }
            }
        }

        return response()->json(['status' => 'error', 'message' => 'System error: Server down!']);
    }
}

