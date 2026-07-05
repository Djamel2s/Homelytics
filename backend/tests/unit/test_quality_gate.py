import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "data"))

from evaluate import check_quality_gate  # noqa: E402


def test_quality_gate_passes_above_threshold():
    assert check_quality_gate(0.75) is True


def test_quality_gate_fails_below_threshold():
    assert check_quality_gate(0.3) is False
