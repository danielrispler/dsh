# Python Reference

## TEST_PATTERN
- `test_*.py`
- `*_test.py`

## TEST_SYNTAX

```python
import pytest

def test_when_condition_then_outcome():
    # Arrange
    # Act
    # Assert
    pass

# Parametrized variants (preferred for multiple inputs)
@pytest.mark.parametrize("input,expected", [
    (valid_input, expected_output),
])
def test_function_name(input, expected):
    result = function_under_test(input)
    assert result == expected
```

## SKIP_PATTERNS
- `requirements.txt`
- `Pipfile.lock`
- `__pycache__/`
- `*.pyc`
- `.venv/`
- `setup.py` (config only)

## FILE_CLASSIFICATION
| Type | Exits | Notes |
|------|-------|-------|
| Route / view | All 5 | Use test client (Flask/Django/FastAPI) |
| Service / use-case | 1,2,3,4 | |
| Infrastructure adapter | 3,4 | External system calls |
| Pure utility | 1 only | |
| Config / `__init__.py` (empty) | None | Skip |
