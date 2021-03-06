"use strict";

var Paginator = function(cfg) {
  this._qry = cfg.qry;
  this._api = cfg.api;

  if (cfg.limit)
    this._pageLimit = cfg.limit;
  else
    this._pageLimit = 25;

  if (cfg.bulkLimit)
    this._bulkLimit = cfg.bulkLimit;
  else
    this._bulkLimit = this._pageLimit;

  this._key = cfg.key;
  this.total = null;
};

Paginator.prototype.pageLimit = function(limit) {
  this._pageLimit = limit;
};

Paginator.prototype.bulkLimit = function(limit) {
  this._bulkLimit = limit;
};

Paginator.prototype.getPage = function(page, cb) {
  this._getPage(page, this._pageLimit, cb);
};

Paginator.prototype._getPage = function(page, limit, cb) {
  this._qry.page = page;
  this._qry.limit = limit;
  var self = this;
  this._api.request(this._qry, function(error, data) {
    if (error) {
      cb(error);
    } else {
      self.total = data.body.meta.total;
      cb(null, (self._key) ? data.body[self._key] : data.body , page);
    }
  });
};

Paginator.prototype.getAll = function(callback) {

  var self = this;
  var pages = {};

  this._getPage(1, this._bulkLimit, function(err, data, page, res) {

    // If error, call back
    if (err)
      return callback(err);

    // If all entries in one page, call back
    if (data.length >= self.total)
      return callback(null, data);

    // Set some root variables
    var done = 1
      , error = false;

    // Calculate required pages
    var required = Math.ceil(self.total/self._bulkLimit);

    // Create temporary item storage array
    var items = new Array(required-1);

    // Get all other pages
    self.getPageRange(2, required, self._bulkLimit, function(err, data2, page) {
      if (err) {
        error = true;
        callback(err);
      } else if (error) {
        return;
      } else {
        items[page-2] = data2;
        done++;
        if (done === required) {
          callback(null, data.concat.apply(data, items));
        }
      }
    });

  });
};

Paginator.prototype.getPageRange = function(start, stop, limit, callback) {
  for (var page = start; page <= stop; page++) {
    this._getPage(page, limit, callback);
  }
};

module.exports = Paginator;
