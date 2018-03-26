function(keyword, location, ellipsis) {
  "use strict";

const fetch = require('node-fetch');

// Requires a Yelp API key in the environment variable YELP_API_KEY
// See https://www.yelp.com/developers/v3/manage_app to create a Yelp app and get an API key
doSearchWithToken(ellipsis.env.YELP_API_KEY);

function doSearchWithToken(token) {
  if (!token) {
    throw new ellipsis.Error("No API key", {
      userMessage: "No API key for Yelp is available. This skill uses an environment variable called YELP_API_KEY which must be set."
    })
  }
  var encodedLocation = encodeURIComponent(location);
  var encodedKeyword = encodeURIComponent(keyword);
  var searchUrl = `https://api.yelp.com/v3/businesses/search?location=${encodedLocation}&term=${encodedKeyword}`;

  fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': "Bearer " + token
    }
  })
  .then((response) => response.json())
  .then((json) => {
    if (json.businesses) {
      processResults(json);
    } else if (json.error && json.error.code === 'TOKEN_MISSING') {
      errorHandler({
        message: "The API key for Yelp is missing. Double-check your YELP_API_KEY environment variable."
      });
    } else if (json.error && json.error.code === 'UNAUTHORIZED_ACCESS_TOKEN') {
      errorHandler({
        message: "Yelp rejected the API key. Double-check your YELP_API_KEY environment variable."
      });
    } else if (json.error) {
      errorHandler({
        message: json.error.code + ': ' + json.error.description,
        type: `Yelp error`
      });
    } else {
      errorHandler({
        message: "No results were found in Yelp’s response."
      });
    }
  }).catch((error) => {
    if (error.name === 'SyntaxError') {
      errorHandler({
        message: "Yelp returned an invalid response."
      });
    } else {
      errorHandler(error);
    }
  });
}

function errorHandler(error) {
  const errorMessage = `I tried to search Yelp for \`${keyword}\` in \`${location}\`, but it didn’t work.`;
  let internalErrorMessage = "";
  if (error && error.message) {
    const errorType = error.type || error.code || error.name || "Error";
    internalErrorMessage += `${errorType}: ${error.message}`;
  }
  throw new ellipsis.Error(internalErrorMessage || "Unknown error", { userMessage: errorMessage });
}

function processResults(results) {
  var top5 = results.businesses.slice(0, 5).map((ea) => {
    ea.stars = getStarsForRating(ea.rating);
    ea.location.address1 = ea.location.address1 || '';
    ea.location.address2 = ea.location.address2 || '';
    ea.location.address3 = ea.location.address3 || '';
    return ea;
  });
  ellipsis.success({
    businesses: top5,
    topCount: top5.length,
    overallCount: results.total
  });
}

function getStarsForRating(rating) {
  var fullStars = '★★★★★';
  var emptyStars = '✩✩✩✩✩';
  var halfStar = '✯';
  var numFullStars = Math.floor(rating);
  var result = fullStars.substr(0, numFullStars);
  if (rating - numFullStars > 0) {
    result += halfStar;
  }
  return result + emptyStars.substr(result.length);
}
}
