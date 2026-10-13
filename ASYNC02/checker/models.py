from dataclasses import dataclass


@dataclass
class CheckResult:
    url: str
    status: int | None
    elapsed: float
    error: str | None

    @property
    def ok(self) -> bool:
        return self.status is not None and self.status < 400
