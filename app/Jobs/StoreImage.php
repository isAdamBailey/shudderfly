<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image;

class StoreImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $image;

    protected $path;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(string $image, string $path)
    {
        $this->image = $image;
        $this->path = $path;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $image = Str::startsWith($this->image, '/tmp')
            ? Image::read($this->image)
            : Image::read(Storage::disk('s3')->get($this->image));

        $encoded = $image->toWebp(60);
        Storage::disk('s3')->put($this->path, (string) $encoded, 'public');
    }
}
