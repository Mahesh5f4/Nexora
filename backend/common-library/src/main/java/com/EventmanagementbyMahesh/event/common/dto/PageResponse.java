package com.EventmanagementbyMahesh.event.common.dto;

import org.springframework.data.domain.Page;
import java.io.Serializable;
import java.util.List;

public class PageResponse<T> implements Serializable {
    private static final long serialVersionUID = 1L;
    
    public List<T> content;
    public int pageNo;
    public int pageSize;
    public long totalElements;
    public int totalPages;
    public boolean last;

    public PageResponse() {
    }

    public PageResponse(List<T> content, int pageNo, int pageSize, long totalElements, int totalPages, boolean last) {
        this.content = content;
        this.pageNo = pageNo;
        this.pageSize = pageSize;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.last = last;
    }

    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }
}
