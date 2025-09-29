#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(LocalSearchModule, RCTEventEmitter)
RCT_EXTERN_METHOD(setQuery:(NSString *)q)
RCT_EXTERN_METHOD(setRegion:(nonnull NSNumber *)lat lon:(nonnull NSNumber *)lon span:(nonnull NSNumber *)span)
RCT_EXTERN_METHOD(resolve:(NSString *)title
                  subtitle:(NSString *)subtitle
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
