// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cached_weather.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetCachedWeatherCollection on Isar {
  IsarCollection<CachedWeather> get cachedWeathers => this.collection();
}

const CachedWeatherSchema = CollectionSchema(
  name: r'CachedWeather',
  id: 4800608797574947525,
  properties: {
    r'fetchedAt': PropertySchema(
      id: 0,
      name: r'fetchedAt',
      type: IsarType.dateTime,
    ),
    r'forecastJson': PropertySchema(
      id: 1,
      name: r'forecastJson',
      type: IsarType.string,
    ),
    r'lat': PropertySchema(
      id: 2,
      name: r'lat',
      type: IsarType.double,
    ),
    r'lng': PropertySchema(
      id: 3,
      name: r'lng',
      type: IsarType.double,
    )
  },
  estimateSize: _cachedWeatherEstimateSize,
  serialize: _cachedWeatherSerialize,
  deserialize: _cachedWeatherDeserialize,
  deserializeProp: _cachedWeatherDeserializeProp,
  idName: r'id',
  indexes: {},
  links: {},
  embeddedSchemas: {},
  getId: _cachedWeatherGetId,
  getLinks: _cachedWeatherGetLinks,
  attach: _cachedWeatherAttach,
  version: '3.1.0+1',
);

int _cachedWeatherEstimateSize(
  CachedWeather object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.forecastJson.length * 3;
  return bytesCount;
}

void _cachedWeatherSerialize(
  CachedWeather object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeDateTime(offsets[0], object.fetchedAt);
  writer.writeString(offsets[1], object.forecastJson);
  writer.writeDouble(offsets[2], object.lat);
  writer.writeDouble(offsets[3], object.lng);
}

CachedWeather _cachedWeatherDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = CachedWeather();
  object.fetchedAt = reader.readDateTime(offsets[0]);
  object.forecastJson = reader.readString(offsets[1]);
  object.id = id;
  object.lat = reader.readDouble(offsets[2]);
  object.lng = reader.readDouble(offsets[3]);
  return object;
}

P _cachedWeatherDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readDateTime(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readDouble(offset)) as P;
    case 3:
      return (reader.readDouble(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _cachedWeatherGetId(CachedWeather object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _cachedWeatherGetLinks(CachedWeather object) {
  return [];
}

void _cachedWeatherAttach(
    IsarCollection<dynamic> col, Id id, CachedWeather object) {
  object.id = id;
}

extension CachedWeatherQueryWhereSort
    on QueryBuilder<CachedWeather, CachedWeather, QWhere> {
  QueryBuilder<CachedWeather, CachedWeather, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension CachedWeatherQueryWhere
    on QueryBuilder<CachedWeather, CachedWeather, QWhereClause> {
  QueryBuilder<CachedWeather, CachedWeather, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterWhereClause> idNotEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterWhereClause> idGreaterThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterWhereClause> idLessThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension CachedWeatherQueryFilter
    on QueryBuilder<CachedWeather, CachedWeather, QFilterCondition> {
  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      fetchedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'fetchedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      fetchedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'fetchedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      fetchedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'fetchedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      fetchedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'fetchedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'forecastJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'forecastJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'forecastJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'forecastJson',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'forecastJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'forecastJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'forecastJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'forecastJson',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'forecastJson',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      forecastJsonIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'forecastJson',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> latEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'lat',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      latGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'lat',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> latLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'lat',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> latBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'lat',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> lngEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'lng',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition>
      lngGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'lng',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> lngLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'lng',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterFilterCondition> lngBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'lng',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }
}

extension CachedWeatherQueryObject
    on QueryBuilder<CachedWeather, CachedWeather, QFilterCondition> {}

extension CachedWeatherQueryLinks
    on QueryBuilder<CachedWeather, CachedWeather, QFilterCondition> {}

extension CachedWeatherQuerySortBy
    on QueryBuilder<CachedWeather, CachedWeather, QSortBy> {
  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> sortByFetchedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fetchedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy>
      sortByFetchedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fetchedAt', Sort.desc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy>
      sortByForecastJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'forecastJson', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy>
      sortByForecastJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'forecastJson', Sort.desc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> sortByLat() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lat', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> sortByLatDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lat', Sort.desc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> sortByLng() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lng', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> sortByLngDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lng', Sort.desc);
    });
  }
}

extension CachedWeatherQuerySortThenBy
    on QueryBuilder<CachedWeather, CachedWeather, QSortThenBy> {
  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> thenByFetchedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fetchedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy>
      thenByFetchedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fetchedAt', Sort.desc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy>
      thenByForecastJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'forecastJson', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy>
      thenByForecastJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'forecastJson', Sort.desc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> thenByLat() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lat', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> thenByLatDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lat', Sort.desc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> thenByLng() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lng', Sort.asc);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QAfterSortBy> thenByLngDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lng', Sort.desc);
    });
  }
}

extension CachedWeatherQueryWhereDistinct
    on QueryBuilder<CachedWeather, CachedWeather, QDistinct> {
  QueryBuilder<CachedWeather, CachedWeather, QDistinct> distinctByFetchedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'fetchedAt');
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QDistinct> distinctByForecastJson(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'forecastJson', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QDistinct> distinctByLat() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'lat');
    });
  }

  QueryBuilder<CachedWeather, CachedWeather, QDistinct> distinctByLng() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'lng');
    });
  }
}

extension CachedWeatherQueryProperty
    on QueryBuilder<CachedWeather, CachedWeather, QQueryProperty> {
  QueryBuilder<CachedWeather, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<CachedWeather, DateTime, QQueryOperations> fetchedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'fetchedAt');
    });
  }

  QueryBuilder<CachedWeather, String, QQueryOperations> forecastJsonProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'forecastJson');
    });
  }

  QueryBuilder<CachedWeather, double, QQueryOperations> latProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'lat');
    });
  }

  QueryBuilder<CachedWeather, double, QQueryOperations> lngProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'lng');
    });
  }
}
