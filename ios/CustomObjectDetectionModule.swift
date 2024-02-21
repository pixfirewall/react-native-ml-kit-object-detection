import Foundation
import MLKit
import React


@objc(CustomObjectDetectionModule)
class CustomObjectDetectionModule: NSObject {
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  let photoObjectDetector: ObjectDetector
  
  override init() {
    guard let localModelFilePath = Bundle.main.path(forResource: "model", ofType: "tflite") else {
      fatalError("Failed to load model")
    }
    let localModel = LocalModel(path: localModelFilePath)
    
    let options = CustomObjectDetectorOptions(localModel: localModel)
    options.detectorMode = .singleImage
    options.shouldEnableClassification = true
    options.shouldEnableMultipleObjects = true
    options.classificationConfidenceThreshold = NSNumber(value: 0.5)
    options.maxPerObjectLabelCount = 3
    photoObjectDetector = ObjectDetector.objectDetector(options: options)
  }
  
  @objc
  func startCustomObjectDetection(_ image: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print(image,"imageurl")
    
    if let imageUrl = URL(string: image),
       let imageData = try? Data(contentsOf: imageUrl),
       let img = UIImage(data: imageData) {
      
      let visionImage = VisionImage(image: img)
      visionImage.orientation = img.imageOrientation
      
      photoObjectDetector.process(visionImage) { objects, error in
        guard error == nil, let objects = objects, !objects.isEmpty else {
          let code = "400"
          let message = "No Object Detected"
          let error = NSError(domain: "domain", code: 400, userInfo: nil)
          rejecter(code,message,error)
          return
        }
        
        var highestConfidenceLabel: String?
        var highestConfidence: Float = 0.0
				let responseArray: NSMutableArray = []
        
        // get objects and their properties
        for object in objects {
					highestConfidence = 0.0
          for label in object.labels {
            if label.confidence > highestConfidence {
              highestConfidence = label.confidence
              highestConfidenceLabel = label.text
            }
          }
					let objectData: NSMutableDictionary = [:]
					objectData["lable"] = highestConfidenceLabel
					objectData["confidence"] = "\(highestConfidence)"
					objectData["width"] = "\(object.frame.width)"
					objectData["height"] = "\(object.frame.height)"
					objectData["cordinates"] = "\(object.frame.minX) \(object.frame.minY) \(object.frame.maxX) \(object.frame.maxY)"
					responseArray.add(objectData)
        }
        
        if let label = highestConfidenceLabel {
          resolver(responseArray)
          print("Label: \(label), Confidence: \(highestConfidence)")
        } else {
          let code = "400"
          let message = "No Label Found"
          let error = NSError(domain: "domain", code: 400, userInfo: nil)
          rejecter(code,message,error)
          print("No label with confidence found")
        }
      }
    }
  }
}
