var shell   = require('shelljs'),
    path    = require('path'),
    fs      = require('fs'),
    colors  = require('colors').setTheme({
      info: 'green',
      warn: 'yellow',
      debug: 'blue',
      error: 'red',
      input: 'grey'
    }),
    FORMATS = ['xml', 'config', 'default'];

/**
 * capitalize
 * 
 * @param {String} str
 *
 * @return {String}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * isString
 *
 * @return {Boolean}
 */
function isString(value) {
  return typeof value === 'string'; 
}

var SCSSLint = {
  reports: {
    
    /**
     * default
     * 
     * @param {String} result
     * @param {String} filePath
     * @param {Object} options
     *
     * @return undefined
     */
    default: function (result) {
      result = result.split('\n')
        .map(function (error) {
          error = error.replace(/(.*)\.tmp\//g, '');
          error = error.match(/(.*:\d+)\s(\[\w+\])(.*)\s/i);
          
          if (!error || !Array.isArray(error) || error.length < 3) {
            return null;
          }

          return {
            file:    error[1].trim(),
            type:    error[2].trim(),
            message: error[3].trim()
          }
        })
        .filter(function (error) {
          return error !== null;
        });

      console.log('[default] Errors'.debug);

      result.forEach(function (error) {
        console.log('%s %s %s', error.file.warn, error.type.warn, error.message.error);
      });
    },

    /**
     * config
     * 
     * @param {String} result
     * @param {String} filePath
     * @param {Object} options
     *
     * @return undefined
     */
    config: function (result) {
      console.log('[config] Options'.debug);
      console.log(result.warn);
    },

    /**
     * xml
     * 
     * @param {String} result
     * @param {String} filePath
     * @param {Object} options
     *
     * @return undefined
     */
    xml: function (result, filePath, options) {
      var replaceRegExp,
          header = '<?xml version="1.0" encoding="utf-8"?>';

      result  = result.match(/<file[^>]*>(.*?)<\/file>/);
      result = (result && result[1]) || '';
      result = '<file name="' + filePath + '">' + result + '</file>';
      
      if (!fs.existsSync(options.reportFile)) {
        fs.writeFileSync(options.reportFile, header + '<lint>' + result + '</lint>');
      } else {
        content = fs.readFileSync(options.reportFile, {encoding: 'utf-8'});
        replaceRegExp = new RegExp('<file name=\"' + filePath + '\">(.*?)<\/file>');

        if (replaceRegExp.test(content)) {
          fs.writeFileSync(options.reportFile, content.replace(replaceRegExp, result));
        } else {
          content = content.replace('</lint>', '');
          content = content + result + '</lint>';
          fs.writeFileSync(options.reportFile, content); 
        }
      }
    }
  },

  /**
   * normalizeOptions
   *
   * @param {String} file
   * @param {String} format
   * @param {Object} options
   *
   * @return {String}
   */
  normalizeOptions: function (file, format, options) {
    var args = ['scss-lint'];

    if (file && isString(file)) {
      args.push(file);
    }
    
    format = (format === 'xml') ? format.toUpperCase(): capitalize(format);

    args.push('-f');
    args.push(format);

    if (options.config && isString(options.config)) {
      args.push('-c');
      args.push(options.config);
    }

    return args.join(' ');
  },

  /**
   * validate
   *
   * @param {Object} options
   *
   * @return undefined
   */
  validate: function (options) {
    if (!shell.which('ruby')) {
      throw new Error('"ruby" does not exist in the system. Please install "ruby".');
    }

    if (!shell.which('scss-lint')) {
      throw new Error('"scss-lint" does not exist in the system. Please install "scss-lint" (gem install scss-lint).');
    }

    options.format.forEach(function (f) {
      if (!~FORMATS.indexOf(f)) {
        throw new Error('"format" must have value which equals xml, config or default');
      }
    })

    if (~options.format.indexOf('xml') && (!options.reportFile || !isString(options.reportFile))) {
      throw new Error('if "format" equals XML, "reportFile" must not be empty');
    }

    if (~options.format.indexOf('xml') && options.reportFile.split('.').pop().toLowerCase() !== 'xml') {
      throw new Error('"reportFile" must have .xml extension'); 
    }

    if (options.config && options.config.split('.').pop().toLowerCase() !== 'yml') {
      throw new Error('"config" file must have .yml extension');
    }
  },

 /**
   * finish
   *
   * @param {Object} options
   *
   * @return undefined
   */
  finish: function (options) {
    if (~options.format.indexOf('xml') && fs.existsSync(options.reportFile)) {
      console.log('[xml] Report have been stored in file %s.'.debug, options.reportFile.info);
    }
  },

 /**
   * lint
   *
   * @param {String}   destDir
   * @param {String}   filePath
   * @param {Object}   options
   *
   * @return {Boolean}
   */
  lint: function (destDir, filePath, options) {
    console.log('Processing %s'.input, filePath);
    
    var _this = this,
        len   = options.format.length, 
        i, 
        result, 
        format,
        isError = false;
    
    for (i = 0; i < len; i++) {
      format = options.format[i].toLowerCase();
      result = shell.exec(_this.normalizeOptions(path.join(destDir, filePath), format, options), {silent: true});
      
      if (result.code !== 0 && result.output) {
        _this.reports[format](result.output, filePath, options);
        isError = true;
      }
    }

    return isError;
  },

 /**
   * format
   *
   * @param {*} format
   *
   * @return {Array}
   */
  format: function (format) {
    if (Array.isArray(format)) {
      return format.length ? format.map(Function.prototype.call, String.prototype.toLowerCase) : ['default'] 
    }

    return [(format || 'default').toLowerCase()];
  }
};

module.exports = SCSSLint;