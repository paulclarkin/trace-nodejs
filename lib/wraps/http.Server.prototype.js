var url = require('url');

var qs = require('qs');
var uuid = require('node-uuid');
var microtime = require('microtime');

var getNamespace = require('continuation-local-storage').getNamespace;
var createNamespace = require('continuation-local-storage').createNamespace;

var Shimmer = require('../shimmer');

var Collector = require('../collector');

function wrapListener(listener, collector) {

  return function (request, response) {
    var headers = request.headers;

    var requestQuery = qs.parse(url.parse(request.url).query).requestId;
    var requestUrl = url.parse(request.url);
    var originalWriteHead = response.writeHead;

    var requestId = headers['request-id'] || requestQuery;
    var seetruData = headers['x-seetru'];
    var serverSendTime;

    if (!requestId) {
      requestId = uuid.v1();
    }

    var collectorDataBag = {
      id: requestId,
      host: headers.host,
      url: requestUrl.pathname,
      time: microtime.now(),
      seetruData: seetruData
    };

    // Set tracking header

    // Collect request start
    process.nextTick(function () {
      collector.emit(Collector.SERVER_RECV, collectorDataBag);
    });

    /*
     * @method instrumentedFinish
     */
    function instrumentedFinish () {

      var collectorDataBag = {
        id: requestId,
        host: headers.host,
        url: requestUrl.pathname,
        time: serverSendTime,
        statusCode: response.statusCode
      };

      // Collect request ended
      process.nextTick(function () {
        collector.emit(Collector.SERVER_SEND, collectorDataBag);
      });
    }

    response.once('finish', instrumentedFinish);

    response.writeHead = function () {
      serverSendTime = microtime.now();
      response.setHeader('x-seetru', serverSendTime + '-' + collector.getService());
      originalWriteHead.apply(response, arguments);
    };

    function addSession () {
      var session = getNamespace('seetru');
      session.bindEmitter(response);
      session.set('request-id', requestId);

      Shimmer.wrap(process, 'process', '_fatalException', function (original) {
        return session.bind(function (stackTrace) {
          collector.onCrash({
            id: session.get('request-id'),
            time: microtime.now(),
            host: headers.host,
            url: requestUrl.pathname,
            stackTrace: stackTrace.stack
          });
          return original.apply(this, arguments);
        });
      });

      return listener.apply(this, arguments);
    }

    return createNamespace('seetru').bind(addSession).apply(this, arguments);
  };
}

module.exports = wrapListener;