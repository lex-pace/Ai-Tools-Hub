"""AI Skills Hub — 通用 Schema 定义"""
from typing import Any, Generic, TypeVar, Optional
from pydantic import BaseModel, Field


T = TypeVar("T")


class Pagination(BaseModel):
    """分页参数"""
    page: int = Field(default=1, ge=1, description="页码，从 1 开始")
    size: int = Field(default=20, ge=1, le=100, description="每页数量")


class PaginationOut(BaseModel):
    """分页输出信息"""
    page: int = Field(description="当前页码")
    size: int = Field(description="每页数量")
    total: int = Field(description="总记录数")
    pages: int = Field(description="总页数")

    @classmethod
    def create(cls, page: int, size: int, total: int) -> "PaginationOut":
        """根据总数计算分页信息"""
        pages = (total + size - 1) // size if total > 0 else 0
        return cls(page=page, size=size, total=total, pages=pages)


class ResponseBase(BaseModel, Generic[T]):
    """统一响应格式"""
    code: int = Field(default=200, description="状态码")
    message: str = Field(default="success", description="提示信息")
    data: Optional[T] = Field(default=None, description="响应数据")


class ResponseWithPagination(BaseModel, Generic[T]):
    """带分页的响应格式"""
    code: int = Field(default=200, description="状态码")
    message: str = Field(default="success", description="提示信息")
    data: list[T] = Field(default_factory=list, description="数据列表")
    pagination: PaginationOut = Field(description="分页信息")
