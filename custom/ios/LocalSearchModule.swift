import Foundation
import MapKit
import React

@objc(LocalSearchModule)
class LocalSearchModule: RCTEventEmitter, MKLocalSearchCompleterDelegate {
  private let completer = MKLocalSearchCompleter()
  private var hasListeners = false

  override init() {
    super.init()
    completer.delegate = self
    completer.resultTypes = [.address, .pointOfInterest]
    NSLog("[LocalSearchModule] init OK")
  }

  override func supportedEvents() -> [String]! { ["onResults"] }
  override static func requiresMainQueueSetup() -> Bool { true }
  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  @objc func setQuery(_ q: NSString) {
    DispatchQueue.main.async {
      NSLog("[LocalSearchModule] setQuery %@", q)
      self.completer.queryFragment = q as String
    }
  }

  @objc func setRegion(_ lat: NSNumber, lon: NSNumber, span: NSNumber) {
    DispatchQueue.main.async {
      let center = CLLocationCoordinate2D(latitude: lat.doubleValue, longitude: lon.doubleValue)
      let s = span.doubleValue
      self.completer.region = MKCoordinateRegion(center: center,
        span: MKCoordinateSpan(latitudeDelta: s, longitudeDelta: s))
      NSLog("[LocalSearchModule] setRegion %f %f %f", lat.doubleValue, lon.doubleValue, s)
    }
  }

  @objc func resolve(_ title: NSString,
                     subtitle: NSString,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    let req = MKLocalSearch.Request()
    req.naturalLanguageQuery = "\(title) \(subtitle)"
    MKLocalSearch(request: req).start { resp, err in
      if let e = err { reject("ERR_SEARCH", e.localizedDescription, e); return }
      guard let item = resp?.mapItems.first else { reject("NO_RESULT", "No result", nil); return }
      let c = item.placemark.coordinate
      resolve([
        "name": item.name ?? title,
        "lat": c.latitude,
        "lng": c.longitude,
        "formattedAddress": item.placemark.title ?? "\(title) \(subtitle)"
      ])
    }
  }

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    guard hasListeners else { return }
    let items = completer.results.map { ["title": $0.title, "subtitle": $0.subtitle] }
    NSLog("[LocalSearchModule] results: %d", items.count)
    sendEvent(withName: "onResults", body: ["items": items])
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    NSLog("[LocalSearchModule] error: %@", error.localizedDescription)
  }
}

