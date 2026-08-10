package com.EventmanagementbyMahesh.event.common.config;

import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class CacheConfig implements CachingConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(CacheConfig.class);

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                logger.error("Redis Get Error for key {}: {}", key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                logger.error("Redis Put Error for key {}: {}", key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                logger.error("Redis Evict Error for key {}: {}", key, exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                logger.error("Redis Clear Error: {}", exception.getMessage());
            }
        };
    }
}
