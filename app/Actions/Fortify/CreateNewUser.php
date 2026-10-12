<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        // 1. Verify that the ZKP data exists in the session (udo)
        if (!session()->has('temp_proof')) {
            throw ValidationException::withMessages([
                'name' => ['Please capture your face before registering.'],
            ]);
        }

        // 2. Create User
        $user =  User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'proof' => session('temp_proof'),
            'vk' => session('temp_vk'),
        ]);

        // 3. Clear the session data (important for security!) (udo)
        session()->forget(['temp_proof', 'temp_vk']);

        return $user;
    }
}
