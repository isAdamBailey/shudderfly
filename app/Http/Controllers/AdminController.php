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

        $permissions = $request->permissions;

        // Only a super admin can hand out (or take away) super admin, so a
        // regular admin cannot promote themselves into maintenance access.
        $wasSuperAdmin = $user->can('super admin');
        $willBeSuperAdmin = in_array('super admin', $permissions, true);

        if ($wasSuperAdmin !== $willBeSuperAdmin && ! $request->user()->can('super admin')) {
            abort(403);
        }

        if ($wasSuperAdmin && ! $willBeSuperAdmin && $this->isLastSuperAdmin($user)) {
            throw ValidationException::withMessages([
                'permissions' => 'The last super admin cannot be demoted.',
            ]);
        }

        $user->syncPermissions($permissions);

        return redirect(route('welcome'));
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

        // Deleting the account would otherwise be a way around the super admin
        // guard in update(), and would orphan the maintenance reports.
        if ($user->can('super admin')) {
            if (! $request->user()->can('super admin')) {
                abort(403);
            }

            if ($this->isLastSuperAdmin($user)) {
                throw ValidationException::withMessages([
                    'email' => 'The last super admin cannot be deleted.',
                ]);
            }
        }

        $user->syncPermissions();
        $user->delete();

        return redirect(route('welcome'));
    }

    /**
     * Guard against locking everyone out of the super admin permission: once
     * the last one is gone it can only be restored from the database.
     */
    private function isLastSuperAdmin(User $user): bool
    {
        return User::permission('super admin')
            ->whereKeyNot($user->getKey())
            ->doesntExist();
    }
}
