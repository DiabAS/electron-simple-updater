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
    let answer = null;
    let isLocal = false;

    request.get(url, (err1, respose1) => {
      if (err1 || respose1.statusCode !== 200) {
        request.get(localUrl, (err2, respose2) => {
          if (err2) {
            reject(err2);
          } else if (respose2.statusCode !== 200) {
            reject(new Error('Response returned code > 200'));
          } else {
            answer = respose2;
            isLocal = true;
          }
        });
      } else {
        answer = respose1;
      }
    });

    try {
      let jsonData = JSON.parse(answer.body);
      if (isLocal) {
        jsonData.update = localUrl.replace('updates.json', jsonData['update-local']);
      }
      resolve(jsonData);
    } catch (e) {
      e.message = `Error while parsing '${url}'. ${e.message}. Data:\n ${answer.body}`;
      reject(e);
    }
  });
}