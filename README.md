[![Laravel Forge Site Deployment Status](https://img.shields.io/endpoint?url=https%3A%2F%2Fforge.laravel.com%2Fsite-badges%2Fa89488e3-6bf3-4f91-9427-41050b590248%3Fdate%3D1&style=flat-square)](https://forge.laravel.com)
[![Tests](https://github.com/adambailey/shudderfly/actions/workflows/test.yml/badge.svg)](https://github.com/adambailey/shudderfly/actions/workflows/test.yml)

## About Shudderfly

[Colin's Shudderfly](https://shudderfly.adambailey.io) is an application I made to upload and structure the images and
videos my son wants to see on his devices.

Because other existing apps with this functionality include a lot of ways for our child to explore outside their applications, such as to marketing or social
links, we needed a way to be in better control of the pictures for his permission level,
and add permissions for users who are able to upload and edit the content.

Images are resized and optimized for web, and videos are processed with FFMPEG before storage.
Shudderfly connects to Amazon S3 for image/video storage, and uses SQS queue for processing the images and videos.

## Development

This project includes [Laravel Sail](https://laravel.com/docs/sail) for local development with Docker.

Simply run `sail up` to start the docker container, then in another terminal, run
`npm install && npm run dev` and vite will watch for changes to the code and hot reload.

## Production

Point to `/public` for the build, and `npm install && npm run prod` for the minified build on production.
