<?php

namespace App\Filters;

use FFMpeg\Filters\Frame\FrameFilterInterface;
use FFMpeg\Media\Frame;

class CustomFrameFilter implements FrameFilterInterface
{
    protected string $filter;

    public function __construct($filter)
    {
        $this->filter = $filter;
    }

    public function apply(Frame $frame): array
    {
        return ['-vf', $this->filter];
    }

    public function getPriority()
    {
        return 10;
    }
}
