# Serverless Sharp Image Processor
A solution to dynamically optimize and transform images on the fly, utilizing [Sharp](https://sharp.pixelplumbing.com/en/stable/).

## Who is this for?
This software is for people who want to optimize and transform (crop, scale, convert, etc) images from an existing S3
bucket without running computationally expensive processes or servers or paying for expensive third-party services.

## How does it work?
After deploying this solution, you'll find yourself with a number of AWS resources (all priced based on usage rather
than monthly cost). The most important of which are:
- **AWS Lambda**: Pulls images from your S3 bucket, runs the transforms, and outputs the image from memory
- **API Gateway**: Acts as a public gateway for requests to your Lambda function
- **Cloudfront Distribution**: Caches the responses from your API Gateway so the Lambda function doesn't re-execute

Once deployed, a Cloudfront CDN distribution is generated that is directed to the generated API Gateway. This distribution
ensures the Lambda function does not get run multiple times for the same image request.

## Configuration & Environment Variables
Make a copy of `settings.example.yml` and populate accordingly.

- `SOURCE_BUCKET` An S3 bucket in your account where your images are stored - you can include a path here if you like.
For example: `mybucket/images`
- `SERVERLESS_PORT` For local development, this controls what port the Serverless service runs on
- `SECURITY_KEY` See security section

## API & Usage
We chose to base our API around the [Imgix service](https://docs.imgix.com/apis/url) to allow for backwards compatibility
with the already popular service. The idea is that all CMS plugins should be able to seamlessly use this service in-place of
an Imgix URL. We've only implemented a hand-full of the features Imgix offers; however, the one's we've
implemented should cover most use-cases.

The benefits of using this method over other methods (such as hashing the entire URL payload in base64) are:
- Much more intuitive
- Easier to develop & debug
- Provides clear prefix matching your original object's path with which you can create invalidations with wildcards

You may access images in your `SOURCE_BUCKET` via the Cloudfront URL that is generated for your distribution just like
normal images. Transforms can be appended to the filename as query parameters. The following query parameters are
supported:
- **fm** - output format - can be one of: `webp`, `png`, `jpeg`, `tiff`
- **w** - width - Scales image to supplied width while maintaining aspect ratio
- **h** - height - Scales image to supplied height while maintaining aspect ratio

*If both width and height are supplied, the aspect ratio will be preserved and scaled to minimum of either width/height*

- **q** - quality (75) - 1-100
- **fit** - resize fitting mode - can be one of: `fill`, `scale`, `crop`, `clip`, `min`, `max`
- **fill-color** - used when `fit` is set to `fill` can be a loosely formatted color such as "red" or "rgb(255,0,0)"
- **crop** - resize fitting mode - can be one of: `focalpoint`, `entropy`, any comma separated combination of `top`, `bottom`, `left` `right`
- **fp-x**, **fp-y** - focal point x & y - percentage, 0 to 1 for where to focus on the image when cropping with focalpoint mode
- **s** - security hash - See security section
- **auto** - can be a comma separated combination of: `compress`, `format`
- **blur** - gaussian blur between 0-2000

### `auto`: format
If `auto` includes format, the service will try to determine the ideal format to convert the image to. The rules are:
- If the browser supports it, everything except for gifs is returned as webp
- If a png is requested and that png has no alpha channel, it will be returned as a jpeg

### `auto`: compress
The `compress` parameter will try to run post-processed optimizations on the image prior to returning it.
- `png` images will run through `pngquant`

## Security
### Request hashing
To prevent abuse of your lambda function, you can set a security key. When the security key environment variable is set,
every request is required to have the `s` query parameter set. This parameter is a simple md5 hash of the following:

`SECURITY KEY + / + PATH + QUERY`

For example, if my security key is set to `asdf` and someone requests:

https://something.cloudfront.net/web/general-images/photo.jpg?auto=compress%2Cformat&crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=380&q=80&w=700

__NOTE:__ The parameters are URI encoded!

They would also need to pass a security key param, `s`,

`md5('asdf' + '/' + 'web/general-images/photo.jpg' + '?auto=compress%2Cformat&crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=380&q=80&w=700')`

or to be more exact...

`md5('asdf/web/general-images/photo.jpg?auto=compress%2Cformat&crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=380&q=80&w=700')`

which equals...

`a0144a80b5b67d7cb6da78494ef574db`

and on our URL...

`https://something.cloudfront.net/web/general-images/photo.jpg?auto=compress%2Cformat&crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=380&q=80&w=700&s=a0144a80b5b67d7cb6da78494ef574db`

### Bucket prefix
The environment variable `SOURCE_BUCKET` may be configured with an optional path prefix if your images are stored in
a "sub-directory". For example, you may use:
`my-bucket/images`

This will tell Serverless to create an IAM role with access to all objects in the my-bucket bucket with an object prefix
of `images`.

Serverless Sharp will then validate all requests to this prefix, if it doesn't start with that prefix, the system will
automatically prepend it to the request images. This means these requests are effectively equivalent:

`localhost/images/my-image.png`

`localhost/my-image.png`

## Should I run this in production?
Probably not. Yet. But if you do, make sure you submit issues!

## Running Locally
This package uses Serverless to allow for local development by simulating API Gateway and Lambda.
1. `npm ci`
2. `cp settings.example.yml settings.yml`
3. Configure settings.yml file
4. Ensure you have AWS CLI configured on your machine with proper access to the S3 bucket you're using in your settings.
5. Run `serverless offline`

## Deploying to AWS
First, we need to procure sharp/libvips binaries compiled for Amazon Linux. We can do this by running the following:

```
npm run sharp:linux
```

This will remove any existing Sharp binaries and then reinstall them with Linux x64 in mind.

Ensure your `settings.yml` file is properly configured as shown in the previous steps

Run: `serverless deploy [--stage=dev] [--settings=settings.yml]`
