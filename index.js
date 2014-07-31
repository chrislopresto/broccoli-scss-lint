var Filter    = require('broccoli-filter'),
    walkSync  = require('walk-sync'),
    mapSeries = require('promise-map-series'),
    helpers   = require('broccoli-kitchen-sink-helpers'),
    mkdirp    = require('mkdirp'),
    Promise   = require('rsvp').Promise,
    fs        = require('fs'),
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
  this.options.format     = _SCSSLint.format(this.options.format);
  this.options.reportFile = this.options.reportFile || '';

  _SCSSLint.validate(this.options);
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
 * @return {String} | null
 */
SCSSLint.prototype.processString = function (content, filePath) {
  return (!_SCSSLint.lint(this.inputTree.tmpDestDir, filePath, this.options)) ? content : null;
};

/**
 * finish
 *
 * @return undefined
 */
SCSSLint.prototype.finish = function () {
  _SCSSLint.finish(this.options);  
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
      self.finish();
    });
  })
}

/**
 * processFile
 *
 * @param {Object} srcDir
 * @param {String} destDir
 * @param {String} relativePath
 * 
 * @return {Object}
 */
SCSSLint.prototype.processFile = function (srcDir, destDir, relativePath) {
  var self   = this,
      string = fs.readFileSync(srcDir + '/' + relativePath, {encoding: 'utf8'}),
      file   = self.getDestFilePath(relativePath); 
  
  return Promise.resolve(self.processString(string, relativePath))
    .then(function (outputString) {
      if (!outputString) {
        return null;  
      }

      fs.writeFileSync(destDir + '/' + file, outputString, {encoding: 'utf8'});
      
      return file;
    })
    .then(function (file) {
      return {
        outputFiles: (file) ? [file] : []
      }
    });
}

module.exports = SCSSLint;