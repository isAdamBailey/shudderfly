## About Book Pages

[Colin's Shudderfly](https://shudderfly.adambailey.io) is an application I made to upload and structure the images and
videos my son wants to see on his devices. This is a port over from [@isAdamBailey/book-pages](https://github.com/isAdamBailey/book-pages) where I build this application.

Because the existing apps with this functionality include a lot of links outside their applications, such as to social
links, we needed a way to just keep him on the page with the pictures for his permission level,
and add permissions for users who are able to upload and edit the content.

Book Pages connects to Amazon S3 for image/video storage.

_NOTE: This application is not allowing registration from the public and requires a secret. This is for family members only._

## Development

This project includes [Laravel Sail](https://laravel.com/docs/sail) for local development with Docker.

Simply run `sail up` to start the docker container, then in another terminal, run
`npm install && npm run watch` and mix will watch for changes to the code and update webpack.

## Production

Point to `/public` for the build, and `npm install && npm run prod` for the minified build on production.
