namespace auth.transport;

entity AppnameMapping {
    key sourceDestination: String;
    key targetDestination: String;
    sourceSuffix: String;
    targetSuffix: String;
}

entity Suffix {
    key destination: String;
    suffix: String;
}