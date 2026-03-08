import Array "mo:core/Array";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";

actor {
  type Coordinate = {
    latitude : Float;
    longitude : Float;
    description : Text;
  };

  module Coordinate {
    public func compare(a : Coordinate, b : Coordinate) : Order.Order {
      Text.compare(a.description, b.description);
    };
  };

  let storage = Map.empty<Nat, Coordinate>();
  var nextId = 0;

  public shared ({ caller }) func addCoordinate(latitude : Float, longitude : Float, description : Text) : async () {
    let coordinate : Coordinate = {
      latitude;
      longitude;
      description;
    };
    storage.add(nextId, coordinate);
    nextId += 1;
  };

  public shared ({ caller }) func deleteCoordinate(id : Nat) : async () {
    switch (storage.get(id)) {
      case (null) { Runtime.trap("Coordinate not found") };
      case (?_) {
        storage.remove(id);
      };
    };
  };

  public query ({ caller }) func getAllCoordinates() : async [Coordinate] {
    storage.values().toArray().sort();
  };

  public query ({ caller }) func getCoordinate(id : Nat) : async Coordinate {
    switch (storage.get(id)) {
      case (null) { Runtime.trap("Coordinate not found") };
      case (?coord) { coord };
    };
  };
};
