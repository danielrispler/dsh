# Flutter Reference

## TEST_PATTERN
- Unit/widget: `test/**/*_test.dart`
- Integration: `integration_test/**/*_test.dart`
  (integration tests live in `integration_test/` root folder, NOT inside `test/`)

## TEST_SYNTAX

Widget test:
```dart
import 'package:flutter_test/flutter_test.dart';

testWidgets('When <condition>, Then <outcome>', (WidgetTester tester) async {
  await tester.pumpWidget(const MyApp());
  await tester.tap(find.byType(ElevatedButton));
  await tester.pump();
  expect(find.text('Expected Text'), findsOneWidget);
});
```

Unit test:
```dart
test('When <condition>, Then <outcome>', () {
  final result = functionUnderTest(input);
  expect(result, equals(expected));
});
```

Integration test (inside `integration_test/`):
```dart
testWidgets('When <user flow>, Then <outcome>', (WidgetTester tester) async {
  app.main();
  await tester.pumpAndSettle();
  // assert
});
```

## SKIP_PATTERNS
- `pubspec.lock`
- `.dart_tool/`
- `build/`

## FILE_CLASSIFICATION
| Type | Exits | Notes |
|------|-------|-------|
| Widget | 1,5 | Widget test: `pump()` + `find.*` assertions |
| BLoC / Cubit | 1,2 | Unit test: state transitions, `emit()` assertions |
| Repository | 3,4 | Mock via `mocktail` |
| Pure utility | 1 only | |
| `pubspec.lock`, `build/` | None | Skip |
