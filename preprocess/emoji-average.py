from PIL import Image
import os, json, math

results = {}


def RGBtoXYZ(rgb):
    def transform(input):
        if (input > 0.04045):
            input = math.pow((input + 0.055) / 1.055, 2.4)
        else:
            input = input / 12.92

        return input * 100.0;

    R = rgb['r']/255.0
    G = rgb['g']/255.0
    B = rgb['b']/255.0
    XYZ = {}

    R = transform(R);
    G = transform(G);
    B = transform(B);
    

    XYZ['x'] = R * 0.4124 + G * 0.3576 + B * 0.1805
    XYZ['y'] = R * 0.2126 + G * 0.7152 + B * 0.0722
    XYZ['z'] = R * 0.0193 + G * 0.1192 + B * 0.9505

    return XYZ


def XYZtoLAB(xyz):
    def transform(input):
        if ( input > 0.008856 ):
            input = math.pow(input, 1.0/3.0)
        else:
            input = ( 7.787 * input ) + ( 16.0 / 116.0 )

        return input;

    refX = 95.047
    refY = 100.0
    refZ = 108.883
    X = xyz['x'] / refX
    Y = xyz['y'] / refY
    Z = xyz['z'] / refZ
    LAB = {}

    X = transform(X);
    Y = transform(Y);
    Z = transform(Z);

    LAB['l'] = 116.0 * Y - 16.0;
    LAB['a'] = 500.0 * (X - Y);
    LAB['b'] = 200.0 * (Y - Z);

    return LAB;

print "Munching on emojis ^_^"
for file in os.listdir("emoji"):

    total_pixels = 0
    totalRGB = {'r': 0, 'g': 0, 'b': 0, 'a': 0}

    emoji_image = Image.open(os.path.join("emoji", file))
    pixels = emoji_image.load()
    
    for i in range(emoji_image.size[0]):
        for j in range(emoji_image.size[1]):
            if pixels[i,j][3] != 0:
                total_pixels += 1
                totalRGB['r'] += pixels[i,j][0]
                totalRGB['g'] += pixels[i,j][1]
                totalRGB['b'] += pixels[i,j][2]

    for key, val in totalRGB.iteritems():
        totalRGB[key] = val/total_pixels

    results[file.replace(".png", "")] = XYZtoLAB(RGBtoXYZ(totalRGB))


averages = open("averages.json", "w")

averages.write(json.dumps(results))
averages.close()

print "All done! See averages.json for results"

