using { auth.transport as db } from '../db/data-model';

type destinations {
    source: String;
    target: String;
}
type result {
    roleCollection: String;
    result: String;
    message: String;
}

service AuthTransportService {
    entity Suffix as projection on db.Suffix;
    action transportRoleCollections (destinations: destinations, roleCollections: array of String) returns array of result;
}