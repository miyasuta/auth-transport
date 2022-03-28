namespace auth.transport;

entity Suffix {
    key destination: String @mandatory;
    suffix: String @mandatory;
}