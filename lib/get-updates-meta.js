'use strict';

const semver  = require('semver');
const request = require('httpreq');

/**
 *
 * @type {Promise<Object|Boolean>}
 */
module.exports = getUpdatesMeta;


/**
 * Return promise which can return false if there are no updates available
 * or object which contains the update information
 * @param {string} updatesUrl
 * @param {string} localUrl
 * @param {string} build Something like win32, nsis, lin64
 * @param {string} channel prod, beta, dev and so on
 * @param {string} version 0.0.1
 * @returns {Promise<Object|Boolean>}
 */
function getUpdatesMeta(updatesUrl, localUrl, build, channel, version) {
  return getJson(updatesUrl, localUrl)
    .then((meta) => {
      return extractUpdateMeta(meta, build, channel, version);
    });
}

function extractUpdateMeta(updatesMeta, build, channel, version) {
  const meta = updatesMeta[`${build}-${channel}`];
  if (!meta || !meta.version) {
    return false;
  }

  if (semver.gt(meta.version, version)) {
    return meta;
  }

  return false;
}

function getJson(url, localUrl) {
  return new Promise((resolve, reject) => {
    let askRemoteAddress = () => {
      request.get(url, (error, response) => {
        if (error || response.statusCode !== 200) {
          return next();
        } else {
          return next(null, {response: response.body, url: url, isLocal: false});
        }
      });
    };

    let askLocalAddress = (data = {}) => {
      if (data.response && data.url) {
        return next(null, data);
      }
      request.get(localUrl, (error, response) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error('Response returned code > 200'));
        } else {
          return next(null, {response: response.body, url: localUrl, isLocal: true});
        }
      });
    };

    let handleResponse = (data = {}) => {
      try {
        let jsonData = JSON.parse(data.response);
        if (data.isLocal) {
          jsonData.update = localUrl.replace('updates.json', jsonData['update-local']);
        }
        resolve(jsonData);
      } catch (error) {
        error.message = `Error while parsing '${data.url}'. ${error.message}. Data:\n ${data.response}`;
        reject(error);
      }
    };

    const tasks = [
      askRemoteAddress,
      askLocalAddress,
      handleResponse
    ];

    let next = (error, result) => {
      if (error) {
        reject(error);
      }
      const current = tasks.shift();
      if (current) {
        current(result);
      }
    };

    next();
  });
}