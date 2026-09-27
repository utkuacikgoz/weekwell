import CoreLocation
import ExpoModulesCore
import MapKit
import UIKit

/// Finds nearby stores with Apple Maps search (MKLocalSearch). The person's
/// location goes to Apple for the search only; Weekwell never stores it.
public class StoreSearchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StoreSearch")

    AsyncFunction("searchAsync") { (query: String, latitude: Double, longitude: Double, radiusMeters: Double) async throws -> [[String: Any]] in
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query
      request.region = MKCoordinateRegion(center: center, latitudinalMeters: radiusMeters * 2, longitudinalMeters: radiusMeters * 2)
      request.resultTypes = .pointOfInterest

      let response = try await MKLocalSearch(request: request).start()
      let origin = CLLocation(latitude: latitude, longitude: longitude)

      return response.mapItems.compactMap { item -> [String: Any]? in
        let placemark = item.placemark
        guard let location = placemark.location else { return nil }
        let street = [placemark.subThoroughfare, placemark.thoroughfare].compactMap { $0 }.joined(separator: " ")
        return [
          "name": item.name ?? query,
          "street": street,
          "city": placemark.locality ?? "",
          "latitude": location.coordinate.latitude,
          "longitude": location.coordinate.longitude,
          "distanceMeters": location.distance(from: origin),
        ]
      }
    }

    // Driving time in minutes, worked out once when the store is found (the
    // person's position isn't kept, so this can't be recomputed later).
    AsyncFunction("driveMinutesAsync") { (fromLatitude: Double, fromLongitude: Double, toLatitude: Double, toLongitude: Double) async throws -> Double in
      let request = MKDirections.Request()
      request.source = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: fromLatitude, longitude: fromLongitude)))
      request.destination = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: toLatitude, longitude: toLongitude)))
      request.transportType = .automobile
      let eta = try await MKDirections(request: request).calculateETA()
      return eta.expectedTravelTime / 60
    }

    // A still map of the store's block with a pin, saved as a PNG in the
    // caches folder; returns its file URL. Only the store's position is used.
    AsyncFunction("mapImageAsync") { (latitude: Double, longitude: Double, width: Double, height: Double, dark: Bool) async throws -> String in
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      let options = MKMapSnapshotter.Options()
      options.region = MKCoordinateRegion(center: center, latitudinalMeters: 1200, longitudinalMeters: 1200)
      options.size = CGSize(width: width, height: height)
      options.traitCollection = UITraitCollection(userInterfaceStyle: dark ? .dark : .light)
      options.pointOfInterestFilter = .excludingAll

      let snapshot = try await MKMapSnapshotter(options: options).start()
      let format = UIGraphicsImageRendererFormat()
      format.scale = snapshot.image.scale
      let image = UIGraphicsImageRenderer(size: snapshot.image.size, format: format).image { _ in
        snapshot.image.draw(at: .zero)
        let point = snapshot.point(for: center)
        let outer = CGRect(x: point.x - 11, y: point.y - 11, width: 22, height: 22)
        UIColor.white.setFill()
        UIBezierPath(ovalIn: outer).fill()
        UIColor(red: 0.66, green: 0.24, blue: 0.16, alpha: 1).setFill()
        UIBezierPath(ovalIn: outer.insetBy(dx: 4, dy: 4)).fill()
      }

      let name = String(format: "store-map-%.5f-%.5f-%dx%d-%@.png", latitude, longitude, Int(width), Int(height), dark ? "dark" : "light")
      let url = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent(name)
      guard let data = image.pngData() else { throw MapImageException() }
      try data.write(to: url, options: .atomic)
      return url.absoluteString
    }
  }
}

internal final class MapImageException: Exception {
  override var reason: String {
    "Couldn't draw the store map"
  }
}
