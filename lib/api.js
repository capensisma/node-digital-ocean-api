var Paginator = require('./paginator');

var API = function(cfg) {
  if (!cfg.token)
    throw new Error("Expecting an access token");
  if (!cfg.request)
    this._request = require('./request');
  else
    this._request = cfg.request;

  this._token = cfg.token;
  this.ratelimit = null;
};

API.prototype._root = 'https://api.digitalocean.com/v2/';





/******************************************************************************/
/******************************************************************************/
/**************************** BASIC METHODS ***********************************/
/******************************************************************************/
/******************************************************************************/

function createError(code, error, original) {
  var e = new Error(error);
  e.code = code;
  if (original)
    e.original = original;
  return e;
}

API.prototype.request = function(qry, cb) {

  // Build the request object from the given query
  var request = this._buildRequest(qry);
  var self = this;
  // Call the requester
  this._request(request, function(error, response) {

    // Parse request_error
    if (error)
      return cb(createError('request_error', 'Request method Error', error));

    if (!response.body)
      response.body = {};

    // Parse request_implementation_error
    if (!response || !response.headers || response.status === undefined)
        return cb(createError('request_implementation_error'
          , 'request method implementation did not return a valid response'));

    // Parse internal error
    if (response.status >= 500 && response.status < 600)
      return cb(
        createError('internal_server_error', 'Something went wrong with the')
        , response.body
      );

    // Parse 400-500 error range
    if (response.status >= 400 && response.status < 500)
      return cb(
        createError('response_error', 'Something wrong with your request')
        , response.body
      );

    // Parse rate limit
    self._parseRateLimit(response);

    // Call back
    cb(null, {
      body: response.body || {},
      headers: response.headers || {},
      status: response.status || 0,
    });

  });
};

API.prototype._buildRequest = function(query) {

  // Create boilerplate request
  var request = {
    method: 'GET',
    headers: {},
    body: {},
  };

  // Overwrite headers
  if (query.headers)
    request.headers = query.headers;

  // Overwrite method
  if (query.method)
    request.method = query.method;

  if (query.body)
    request.body = query.body;

  // Create request uri
  request.uri = this._root+query.target;

  // Page and limit
  if (query.page && query.limit) {
    request.uri += '?page='+query.page+'&per_page='+query.limit;
  } else if (query.page) {
    request.uri += '?page='+query.page;
  } else if (query.limit) {
    request.uri += "?per_page="+query.limit;
  }

  // Set content type
  request.headers['Content-Type'] = 'application/json';

  // Authenticate
  this._authenticateRequest(request);

  return request;
};

API.prototype._authenticateRequest = function(request) {
  request.headers['Authorization'] = 'Bearer '+this._token;
};

API.prototype._parseRateLimit = function(response) {
  if (!response.headers)
    return;

};





/******************************************************************************/
/******************************************************************************/
/*************************** UTILITY METHODS **********************************/
/******************************************************************************/
/******************************************************************************/

API.prototype.regularRequest = function(qry, key, cb) {
  this.request(qry, function(err, data) {
    if(err !== null)
      cb(err, data);
    else
      cb(null, data.body[key]);
  });
};

API.prototype.paginatedRequest = function(qry, key, cb) {

  var paginator = new Paginator({
    qry: qry,
    api: this,
    key: key,
  });

  if (cb) {
    paginator.getAll(cb);
    return;
  } else {
    return paginator;
  }
};

API.prototype._dropletAction = function(id, type, body, callback) {
  if (!body)
    body = {};
  body.type = type;
  this.regularRequest({
    target: 'droplets/'+id+'/actions',
    method: 'POST',
    body: body
  }, 'action', callback);
};

/******************************************************************************/
/******************************************************************************/
/***************************** API METHODS ************************************/
/******************************************************************************/
/******************************************************************************/


/******************************************************************************/
/******************************** Account *************************************/
/******************************************************************************/

API.prototype.getUserInfo = function(callback) {
  this.regularRequest({
    target: 'account',
    method: 'GET'
  }, 'account', callback);
};

/******************************************************************************/
/******************************** Actions *************************************/
/******************************************************************************/

API.prototype.listActions = function(callback) {
  return this.paginatedRequest({
    target: 'actions',
    method: 'GET'
  }, 'actions', callback);
};

API.prototype.getAction = function(id, callback) {
  this.regularRequest({
    target:'actions/'+id,
    method: 'GET'
  }, 'action', callback);
};

/******************************************************************************/
/******************************** Domains *************************************/
/******************************************************************************/

API.prototype.listDomains = function(callback) {
  return this.paginatedRequest({
    target: 'domains',
    method: 'GET'
  }, 'domains', callback);
};

/******************************************************************************/
/******************************** Droplets *************************************/
/******************************************************************************/

API.prototype.listDroplets = function(callback) {
  return this.paginatedRequest({
    target: 'droplets',
    method: 'GET'
  }, 'droplets', callback);
};

API.prototype.getDroplet = function(id, callback) {
  this.regularRequest({
    target:'droplets/'+id,
    method: 'GET'
  }, 'droplet', callback);
};

API.prototype.listAvailableKernels = function(id, callback) {
  this.paginatedRequest({
    target:'droplets/'+id+'/kernels',
    method: 'GET'
  }, 'kernels', callback);
};

API.prototype.listDropletSnapshots = function(id, callback) {
  this.paginatedRequest({
    target:'droplets/'+id+'/snapshots',
    method: 'GET'
  }, 'snapshots', callback);
};

API.prototype.listDropletBackups = function(id, callback) {
  this.paginatedRequest({
    target:'droplets/'+id+'/backups',
    method: 'GET'
  }, 'backups', callback);
};

API.prototype.listDropletActions = function(id, callback) {
  this.paginatedRequest({
    target:'droplets/'+id+'/actions',
    method: 'GET'
  }, 'actions', callback);
};

API.prototype.getDropletAction = function(id, actionId, callback) {
  this.regularRequest({
    target:'droplets/'+id+'/actions/'+actionId,
    method: 'GET'
  }, 'action', callback);
};

API.prototype.deleteDroplet = function(id, callback) {
  this.request({
    target: 'droplets/'+id,
    method: 'DELETE'
  }, function(error, response) {
    if (error)
      callback(error, false);
    else
      callback(null, true);
  });
};

API.prototype.createDroplet = function(cfg, callback) {
  this.regularRequest({
    target: 'droplets/',
    method: 'POST',
    body: cfg
  }, 'droplet', callback);
  // name, region, size, image, (notrequired) ssh_keys, backups, ipv6,
  // private_networking, user_data
};

API.prototype.disableDropletBackups = function(id, callback) {
  this._dropletAction(id, 'disable_backups', {}, callback);
};

API.prototype.rebootDroplet = function(id, callback) {
  this._dropletAction(id, 'reboot', {}, callback);
};

API.prototype.powerCycleDroplet = function(id, callback) {
  this._dropletAction(id, 'power_cycle', {}, callback);
};

API.prototype.shutdownDroplet = function(id, callback) {
  this._dropletAction(id, 'shutdown', {}, callback);
};

API.prototype.powerOnDroplet = function(id, callback) {
  this._dropletAction(id, 'power_on', {}, callback);
};

API.prototype.powerOffDroplet = function(id, callback) {
  this._dropletAction(id, 'power_off', {}, callback);
};

API.prototype.restoreDroplet = function(id, image, callback) {
  this._dropletAction(id, 'restore', {
    image: image
  }, callback);
};

API.prototype.passwordResetDroplet = function(id, callback) {
  this._dropletAction(id, 'pw_reset', {}, callback);
};

API.prototype.resizeDroplet = function(id, size, callback) {
  this._dropletAction(id, 'resize', {
    size: size
  }, callback);
};

API.prototype.rebuildDroplet = function(id, image, callback) {
  this._dropletAction(id, 'rebuild', {
    image: image
  }, callback);
};

API.prototype.rebuildDroplet = function(id, name, callback) {
  this._dropletAction(id, 'rename', {
    name: name
  }, callback);
};

API.prototype.changeDropletKernel = function(id, kernel, callback) {
  this._dropletAction(id, 'change_kernel', {
    kernel: kernel
  }, callback);
};

API.prototype.enableIpv6Droplet = function(id, callback) {
  this._dropletAction(id, 'enable_ipv6', {}, callback);
};

API.prototype.enableDropletPrivateNetwork = function(id, callback) {
  this._dropletAction(id, 'enable_private_networking', {}, callback);
};

API.prototype.snapshotDroplet = function(id, name, callback) {
  this._dropletAction(id, 'snapshot', {
    name: name
  }, callback);
};

/******************************************************************************/
/********************************* Images *************************************/
/******************************************************************************/

API.prototype.listImages = function(callback) {
  return this.paginatedRequest({
    target: 'images',
    method: 'GET'
  }, 'images', callback);
};

API.prototype.listDistributionImages = function(callback) {
  return this.paginatedRequest({
    target: 'images?type=distribution',
    method: 'GET'
  }, 'images', callback);
};

API.prototype.listApplicationImages = function(callback) {
  return this.paginatedRequest({
    target: 'images?type=application',
    method: 'GET'
  }, 'images', callback);
};

API.prototype.getImage = function(id, callback) {
  this.regularRequest({
    target:'images/'+id,
    method: 'GET'
  }, 'image', callback);
};

API.prototype.getImageBySlug = function(slug, callback) {
  this.getImage(slug, callback);
};

API.prototype.updateImage = function(id, name, callback) {
  this.regularRequest({
    target:'images/'+id,
    method: 'POST',
    body: {
      name: name
    }
  }, 'image', callback);
};

API.prototype.deleteImage = function(id, callback) {
  this.request({
    target: 'images/'+id,
    method: 'DELETE'
  }, function(error, response) {
    if (error)
      callback(error, false);
    else
      callback(null, true);
  });
};

/******************************************************************************/
/******************************** SSHKeys *************************************/
/******************************************************************************/

API.prototype.listKeys = function(callback) {
  return this.paginatedRequest({
    target: 'account/keys',
    method: 'GET'
  }, 'ssh_keys', callback);
};


/******************************************************************************/
/******************************** Various *************************************/
/******************************************************************************/

API.prototype.listRegions = function(callback) {
  return this.paginatedRequest({
    target: 'regions',
    method: 'GET'
  }, 'regions', callback);
};

API.prototype.listSizes = function(callback) {
  return this.paginatedRequest({
    target: 'sizes',
    method: 'GET'
  }, 'sizes', callback);
};

module.exports = API;
