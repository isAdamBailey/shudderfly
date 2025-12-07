<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Hasroles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'permissions',
        'roles',
        'id',
        'updated_at',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    protected $appends = [
        'permissions_list',
        'avatar_url',
    ];

    public function getPermissionsListAttribute(): Collection
    {
        return $this->getAllPermissions()->pluck('name');
    }

    /**
     * Get the user's avatar URL or initials-based avatar.
     *
     * @return string
     */
    public function getAvatarUrlAttribute(): string
    {
        if ($this->avatar) {
            return $this->avatar;
        }

        return $this->getInitialsAvatarUrl();
    }

    /**
     * Get initials from user's name.
     *
     * @return string
     */
    public function getInitials(): string
    {
        $name = trim($this->name);
        if (empty($name)) {
            return '?';
        }

        $parts = explode(' ', $name);
        if (count($parts) >= 2) {
            return strtoupper(substr($parts[0], 0, 1) . substr(end($parts), 0, 1));
        }

        return strtoupper(substr($name, 0, min(2, strlen($name))));
    }

    /**
     * Get initials-based avatar URL from ui-avatars.com.
     *
     * @return string
     */
    protected function getInitialsAvatarUrl(): string
    {
        $initials = $this->getInitials();
        
        $colors = [
            '6366f1', '8b5cf6', 'ec4899', 'f59e0b',
            '10b981', '06b6d4', 'f97316', '84cc16',
        ];
        $colorIndex = $this->id ? ($this->id % count($colors)) : 0;
        $backgroundColor = $colors[$colorIndex];

        return 'https://ui-avatars.com/api/?name=' . urlencode($initials) . '&background=' . $backgroundColor . '&color=ffffff&size=100&bold=true';
    }
}
