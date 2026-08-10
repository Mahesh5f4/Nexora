package com.EventmanagementbyMahesh.event.common.filter;

import jakarta.servlet.*;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class ConcurrentRequestTracker implements Filter {

    private final AtomicInteger activeRequests = new AtomicInteger(0);
    private final AtomicInteger peakRequests = new AtomicInteger(0);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        
        int current = activeRequests.incrementAndGet();
        
        // Update peak using a simple compare and swap loop
        while (true) {
            int existingPeak = peakRequests.get();
            if (current <= existingPeak) break;
            if (peakRequests.compareAndSet(existingPeak, current)) break;
        }

        try {
            chain.doFilter(request, response);
        } finally {
            activeRequests.decrementAndGet();
        }
    }

    public int getActiveRequests() {
        return activeRequests.get();
    }

    public int getPeakRequests() {
        return peakRequests.get();
    }
}
