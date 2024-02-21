import React, { useState } from 'react';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  Text,
  View,
  Image,
  Alert,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  NativeModules,
  TouchableOpacity,
} from 'react-native';

interface DetectedObject {
  cordinates: string;
  lable: string;
  width: string;
  height: string;
  confidence: string;
}

interface Scale {
  direction: 'H' | 'W';
  image?: number;
  box?: number;
  scale: number;
  offset?: number;
}

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const getScale = ({ direction, image = 0, box = 0, scale, offset = 0 }: Scale) => {
  if (image < 1) {
    return 0;
  }
  switch (direction) {
    case 'W':
      return Math.ceil(box * (scale / image)) + offset;

    case 'H':
      return Math.ceil(box * (scale / image)) + offset;

    default:
      throw new Error('Wrong Direction!');
  }
};

function App(): JSX.Element {
  const [image, setImage] = useState<Asset>();
  const [latency, setLatency] = useState<number>(0);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const { CustomObjectDetectionModule } = NativeModules;

  const objectDetection = async (asset: Asset) => {
    try {
      const start = new Date().valueOf();
      const res = await CustomObjectDetectionModule.startCustomObjectDetection(asset.uri);
      const end = new Date().valueOf();
      setLatency((end - start) / 1000);
      const imageViewHeight = (windowWidth * (asset.height ?? 1)) / (asset.width ?? 1);
      const imageViewWidth = (windowWidth * windowHeight * 0.5) / imageViewHeight;
      if (imageViewHeight > 0.5 * windowHeight) {
        setImageSize({ height: windowHeight * 0.5, width: imageViewWidth });
      } else {
        setImageSize({ height: imageViewHeight, width: windowWidth });
      }
      setDetectedObjects(res);
      setImage(asset);
    } catch (error) {
      Alert.alert('Error', 'No Object Detected', [{ text: 'OK' }]);
    }
  };

  const chooseFile = async () => {
    launchImageLibrary({ mediaType: 'photo' }, async response => {
      if (!response.didCancel) {
        if (response.assets && response.assets.length > 0) {
          objectDetection(response.assets[0]);
        }
      } else {
        console.log(response.errorMessage);
      }
    });
  };

  const openCamera = () => {
    launchCamera({ mediaType: 'photo' }, async response => {
      if (!response.didCancel) {
        if (response.assets && response.assets.length > 0) {
          objectDetection(response.assets[0]);
        }
      } else {
        console.log(response.errorMessage);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.textStyle}>Latency: {latency}s</Text>
      <View
        style={[
          styles.imageContainer,
          { height: imageSize.height, width: imageSize.width },
        ]}>
        {image?.uri ? (
          <Image
            style={styles.imageStyle}
            source={{
              uri: image?.uri,
            }}
          />
        ) : null}
        {detectedObjects.map((obj, i) => {
          const [left, top, right, bottom] = obj.cordinates.split(' ').map((p, i) => {
            const sss = (i + 1) % 2;
            return getScale({
              direction: sss ? 'W' : 'H',
              image: sss ? image?.width : image?.height,
              box: Number(p),
              scale: sss ? imageSize.width : imageSize.height,
            });
          });

          return (
            <View
              key={i}
              style={[
                styles.rectangle,
                {
                  height: bottom - top,
                  width: right - left,
                  top,
                  left: left,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.buttonStyle} onPress={chooseFile}>
          <Text style={styles.buttonLabelStyle}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonStyle} onPress={openCamera}>
          <Text style={styles.buttonLabelStyle}>Camera</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginTop: 40,
  },
  rectangle: {
    borderWidth: 2,
    borderColor: 'red',
    position: 'absolute',
    zIndex: 99,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignContent: 'center',
    padding: 20,
    justifyContent: 'space-between',
  },
  buttonStyle: {
    height: 30,
    width: 100,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  textStyle: {
    color: 'black',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
  },
  imageStyle: {
    height: '100%',
    width: '100%',
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  buttonContainer: {
    height: '15%',
    backgroundColor: 'green',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
  },
  buttonLabelStyle: { fontSize: 15, fontWeight: '500', color: 'black' },
});

export default App;
