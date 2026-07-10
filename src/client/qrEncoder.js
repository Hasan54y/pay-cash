var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = new Array();

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw new Error('code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')');
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw new Error(row + ',' + col);
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      makeImpl(false, getBestMaskPattern() );
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytes = function(s) {
    var bytes = new Array();
    for (var i = 0; i < s.length; i += 1) {
      var c = s.charCodeAt(i);
      bytes.push(c & 0xff);
    }
    return bytes;
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw new Error('bad maskPattern:' + maskPattern);
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw new Error('mode:' + mode);
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw new Error('mode:' + mode);
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw new Error('mode:' + mode);
        }

      } else {
        throw new Error('type:' + type);
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw new Error('glog(' + n + ')');
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw new Error(num.length + '/' + shift);
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw new Error('bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel);
      }

      var length = rsBlock.length / 3;

      var list = new Array();

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = new Array();
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

</script>

<script>
const LOGO_DATA_URI = "data:image/png;base64,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";
