const ImageRequest = require('./ImageRequest.js')
const ImageHandler = require('./ImageHandler.js')

exports.handler = async (event) => {
  const imageRequest = new ImageRequest(event)
  await imageRequest.process() // This is important! We need to load the metadata off the image and check the format
  const imageHandler = new ImageHandler(imageRequest)

  try {
    const processedRequest = await imageHandler.process()
    const response = {
      statusCode: 200,
      headers: getResponseHeaders(processedRequest, null),
      body: processedRequest.Body,
      isBase64Encoded: true
    }
    return response
  } catch (err) {
    console.log(err)
    const response = {
      statusCode: err.status,
      headers: getResponseHeaders(null, true),
      body: JSON.stringify(err),
      isBase64Encoded: false
    }
    return response
  }
}

/**
 * Generates the appropriate set of response headers based on a success
 * or error condition.
 * @param processedRequest
 * @param {boolean} isErr - has an error been thrown?
 */
const getResponseHeaders = (processedRequest, isErr) => {
  const headers = {
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': true
  }
  if (processedRequest && 'CacheControl' in processedRequest) {
    headers['Cache-Control'] = processedRequest.CacheControl
  }
  if (processedRequest && 'ContentType' in processedRequest) {
    headers['Content-Type'] = processedRequest.ContentType
  }
  if (isErr) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}
