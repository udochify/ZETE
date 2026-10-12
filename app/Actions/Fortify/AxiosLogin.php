<?php

namespace App\Actions\Fortify;

use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AxiosLogin
{
    /**
     * Handle the incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  callable  $next
     * @return mixed
     */
    public function handle(Request $request, $next)
    {
        $internal_server_error = NULL;
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'privatekey' => 'required|string',
        ]);

        // 1. Find the user by the email in the request
        $user = User::where('email', $request->email)->first();

        // 2. If user doesn't exist, we let Fortify handle the "Invalid Credentials" error later
        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['This user does not Exist'],
            ]);
        }
        // 1. Get the image from the request
        $image = $request->file('image');

        // 2. Prepare the data from the User model
        $payload = [
            'proof' => $user->proof,
            'vk' => $user->vk,
            'offset' => $request->privatekey, // Use the private key from the request
        ];

        try {
            // 3. Send Multi-part request
            $response = Http::attach(
                'file',  // The key FastAPI expects for the file
                file_get_contents($image->getRealPath()), 
                'login_capture.jpg'  // Filename
            )->post('http://127.0.0.1:7000/authenticate', $payload);

            if($response->successful()) {
                $result = $response->json();
                Log::info($response);

                if (isset($result['status']) && $result['status'] === "success") {
                    return $next($request);
                } else {
                    $internal_server_error = 'ZKP Biometric verification failed.';
                    throw ValidationException::withMessages([
                        'image' => [$internal_server_error],
                    ]);
                    Log::info("After throw");
                    return;
                }
            }

        } catch (Exception $e) {
            Log::error('ZKP Service Error: ' . $e->getMessage());
            throw ValidationException::withMessages([
                'image' => [$internal_server_error ?? 'ZKP Verification service is currently unavailable.'],
            ]);
        }

        // } catch (Exception $e) {
        //     Log::error('ZKP Service Error: ' . $e->getMessage());
        //     throw ValidationException::withMessages([
        //         'image' => ['System error: ZKP Server is possibly down!'],
        //     ]);
        // }
    }
}