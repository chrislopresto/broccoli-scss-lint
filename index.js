var Filter    = require('broccoli-filter'),
    walkSync  = require('walk-sync'),
    mapSeries = require('promise-map-series'),
    mkdirp    = require('mkdirp'),
    helpers = require('broccoli-kitchen-sink-helpers'),
    _SCSSLint = require('./lib/scss-lint');

/**
 * SCSSLint
 *
 * @param {Object} inputTree
 * @param {Object} options
 * 
 * @return undefined
 */
function SCSSLint(inputTree, options) {
  if (!(this instanceof SCSSLint)) {
    return new SCSSLint(inputTree, options);
  }

  this.inputTree = inputTree;
  this.options   = options;
  
  this.options.config     = this.options.config || '';
  this.options.format     = (this.options.format || 'default').toLowerCase();
  this.options.reportFile = this.options.reportFile || '';

  _SCSSLint.validate(this.options);
  _SCSSLint.before(this.options);
}

SCSSLint.prototype                 = Object.create(Filter.prototype);
SCSSLint.prototype.constructor     = SCSSLint;
SCSSLint.prototype.extensions      = ['scss'];
SCSSLint.prototype.targetExtension = 'scss';

/**
 * processString
 *
 * @param {String} content
 * @param {String} path
 * 
 * @return undefined
 */
SCSSLint.prototype.processString = function (content, filePath) {
  _SCSSLint.lint(this.inputTree.tmpDestDir, filePath, this.options);
};

/**
 * after
 *
 * @return undefined
 */
SCSSLint.prototype.after = function () {
  _SCSSLint.after(this.options);  
};

/**
 * write
 *
 * @param {Object} readTree
 * @param {String} destDir
 * 
 * @return {Object}
 */
SCSSLint.prototype.write = function (readTree, destDir) {
  var self = this;
    
  return readTree(this.inputTree).then(function (srcDir) {
    var paths = walkSync(srcDir);

    return mapSeries(paths, function (relativePath) {
      if (relativePath.slice(-1) === '/') {
        mkdirp.sync(destDir + '/' + relativePath);
      } else {
        if (self.canProcessFile(relativePath)) {
          return self.processAndCacheFile(srcDir, destDir, relativePath);
        } else {
          helpers.copyPreserveSync(srcDir + '/' + relativePath, destDir + '/' + relativePath);
        }
      }
    }).then(function () {
      self.after();
    });
  })
}

module.exports = SCSSLint;