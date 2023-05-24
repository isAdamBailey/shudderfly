<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function update(Request $request): Redirector|Application|RedirectResponse
    {
        $this->validate($request, [
            'user' => 'required|array',
            'permissions' => 'present|array',
        ]);

        $user = User::where([
            'email' => $request->user['email'],
            'name' => $request->user['name'],
        ])->first();

        if (count($request->permissions) > 0) {
            $user->givePermissionTo($request->permissions);
        } else {
            $user->syncPermissions();
        }

        return redirect(route('dashboard'));
    }

    /**
     * Remove the specified resource from storage.
     *
     *
     * @throws ValidationException
     */
    public function destroy(Request $request): Redirector|RedirectResponse|Application
    {
        $this->validate($request, [
            'email' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();
        $user->syncPermissions();
        $user->delete();

        return redirect(route('dashboard'));
    }
}
