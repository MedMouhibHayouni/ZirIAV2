void main() {
  dynamic list = [{'id': 1}, {'id': 2}];
  dynamic result = list.map((e) => MyClass(e['id'])).toList();
  print(result.runtimeType);
  if (result is List<MyClass>) {
    print("It is List<MyClass>");
  } else {
    print("It is NOT List<MyClass>");
  }
}
class MyClass {
  int id;
  MyClass(this.id);
}
