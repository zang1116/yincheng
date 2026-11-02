package app.yincheng.planner;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemAlarmPlugin.class);
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                String script = "(function(){try{return !!(window.YinchengApp&&window.YinchengApp.handleAndroidBack&&window.YinchengApp.handleAndroidBack());}catch(e){return false;}})()";
                getBridge().getWebView().evaluateJavascript(script, result -> {
                    if (!"true".equals(result)) finish();
                });
            }
        });
    }
}
