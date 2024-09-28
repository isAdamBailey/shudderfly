<?php

namespace App\Filters;

use FFMpeg\Filters\Frame\FrameFilterInterface;
use FFMpeg\Media\Frame;

class CustomFrameFilter implements FrameFilterInterface
{
    public function apply(Frame $frame): array
    {
        return ['-vf', '-frames:v', '1'];
    }

    public function getPriority(): int
    {
        return 10;
    }
}
