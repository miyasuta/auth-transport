using { auth.transport as db } from '../db/data-model';

service AuthTransportService {
    entity Suffix as projection on db.Suffix;
}