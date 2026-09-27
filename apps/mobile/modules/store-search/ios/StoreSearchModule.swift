import CoreLocation
import ExpoModulesCore
import MapKit

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
  }
}
