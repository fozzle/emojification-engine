var ColorUtils = (function() {
  
  // Transforms RGB to XYZ
  var RGBtoXYZ = function(rgb) {
    var R = rgb.r/255,
        G = rgb.g/255,
        B = rgb.b/255,
        XYZ = {};


    function transform(input) {
      if (input > 0.04045) {
        input = Math.pow( (input + 0.055) / 1.055 , 2.4 );
      } else {
        input = input / 12.92;
      }

      return input * 100;
    }

    R = transform(R);
    G = transform(G);
    B = transform(B);

    XYZ.x = R * 0.4124 + G * 0.3576 + B * 0.1805;
    XYZ.y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    XYZ.z = R * 0.0193 + G * 0.1192 + B * 0.9505;

    return XYZ;
  };

  // Transforms XYZ to LAB
  // Using reference values Illuminant: D65, Observer: 10deg (LAB 1964), from easyRGB table
  var XYZtoLAB = function(xyz) {
    var refX = 95.047,
        refY = 100,
        refZ = 108.883,
        X = xyz.x / refX,
        Y = xyz.y / refY,
        Z = xyz.z / refZ,
        LAB = {};

    function transform(input) {
      if ( input > 0.008856 ) {
        input = Math.pow(input, 1/3);
      } else {
        input = ( 7.787 * input ) + ( 16 / 116 );
      }

      return input;
    }

    X = transform(X);
    Y = transform(Y);
    Z = transform(Z);

    LAB.l = 116 * Y - 16;
    LAB.a = 500 * (X - Y);
    LAB.b = 200 * (Y - Z);

    return LAB;
  };

  // Finds LAB distance based on CIE1976
  var colorDistance = function(lab1, lab2) {
    return Math.sqrt( Math.pow(lab1.l - lab2.l, 2)  + Math.pow(lab1.a - lab2.a, 2) + Math.pow(lab1.b - lab2.b, 2) );
  }

  return {
    RGBtoXYZ: RGBtoXYZ,
    XYZtoLAB: XYZtoLAB,
    colorDistance: colorDistance
  }
})();