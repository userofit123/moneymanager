package app.moneymanager.android

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.util.concurrent.CountDownLatch

/**
 * Money Manager for Android: the app's own screens in a web view, with the data of the server the user chose (see ShellServer), and a lock on opening.
 * The app never collects bank data itself: the server does that.
 */
class MainActivity : AppCompatActivity() {
    lateinit var web: WebView
    lateinit var store: ServerStore
    lateinit var net: Net
    lateinit var texts: Texts
    lateinit var lock: AppLock
    private lateinit var root: FrameLayout
    private var overlay: View? = null
    private var shell: ShellServer? = null
    @Volatile private var base = ""
    @Volatile private var target: Target? = null
    @Volatile private var currentUrl = ""
    private var fallbackHost: String? = null
    private var pausedAt = 0L
    private var chooser: ValueCallback<Array<Uri>>? = null

    private val prefs by lazy { getSharedPreferences("app", MODE_PRIVATE) }
    var lockEnabled: Boolean
        get() = prefs.getBoolean("lock", false)
        private set(v) { prefs.edit().putBoolean("lock", v).apply() }
    // how many seconds away before the app asks again (0 = every time you leave it)
    var lockDelay: Int
        get() = prefs.getInt("lockDelay", 30)
        set(v) { prefs.edit().putInt("lockDelay", v).apply() }

    private val pickFile = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        chooser?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
        chooser = null
    }
    private val askCamera = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        texts = Texts(this)
        store = ServerStore(this)
        net = Net(this)
        lock = AppLock(this, texts)

        web = WebView(this)
        root = FrameLayout(this).apply { addView(web, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)) }
        setContentView(root)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        android.webkit.CookieManager.getInstance().setAcceptCookie(true)
        web.addJavascriptInterface(Bridge(this), "mmNative")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                val own = u.toString().startsWith(base) || (fallbackHost != null && u.host == fallbackHost)
                if (!own) openExternal(u.toString())
                return !own
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                currentUrl = url
                if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT) && url.startsWith(base)) view.evaluateJavascript(Bridge.SHIM, null)
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, cb: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                chooser?.onReceiveValue(null)
                chooser = cb
                return try {
                    pickFile.launch(params.createIntent())
                    true
                } catch (e: Exception) {
                    chooser = null
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                // the camera, for a receipt photo, only for the app's own screens
                if (!isOwnPage()) { request.deny(); return }
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) request.grant(request.resources)
                else { askCamera.launch(Manifest.permission.CAMERA); request.deny() }
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else finish() }
        })

        startShell()
        if (lockEnabled) showLock() else route()
    }

    /** The app's own address (the screens and the server list), not a page of a server. */
    fun isOwnPage(): Boolean = base.isNotEmpty() && currentUrl.startsWith(base)

    private fun startShell() {
        for (port in listOf(47930, 0)) {
            try {
                val s = ShellServer(port, assets) { target }
                s.start()
                shell = s
                base = "http://127.0.0.1:${s.listeningPort}"
                break
            } catch (e: Exception) { /* the port is taken: any free one */ }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) WebViewCompat.addDocumentStartJavaScript(web, Bridge.SHIM, setOf(base))
    }

    /** Open what should be on screen: the server list when no server was chosen, else the app's screens with that server's data. */
    fun route() {
        val s = store.state.current()
        if (s == null) {
            target = null
            fallbackHost = null
            web.loadUrl("$base/servers.html")
            return
        }
        Thread {
            val info = net.info(s.url)
            runOnUiThread {
                if (Compat.fits(info)) {
                    target = Target(s.url, net.client({ s.trust }))
                    fallbackHost = null
                    web.loadUrl("$base/")
                } else {
                    // the server and these screens do not fit: the server's own pages are shown instead, with a note
                    target = null
                    fallbackHost = Uri.parse(s.url).host
                    val v = info?.version ?: ""
                    AlertDialog.Builder(this).setMessage(if (v.isNotEmpty()) texts.fill("mismatch", "s" to v, "a" to BuildConfig.VERSION_NAME) else texts["mismatchOld"]).setPositiveButton("OK", null).show()
                    web.loadUrl(s.url)
                }
            }
        }.start()
    }

    /** Ask the user whether to trust a server's certificate (fingerprint shown); answers on the calling thread. */
    fun askTrust(host: String, fingerprint: String): Boolean {
        val latch = CountDownLatch(1)
        var yes = false
        runOnUiThread {
            AlertDialog.Builder(this)
                .setTitle(texts["certTitle"])
                .setMessage(texts.fill("certMsg", "host" to host, "fp" to fingerprint))
                .setPositiveButton(texts["certYes"]) { _, _ -> yes = true; latch.countDown() }
                .setNegativeButton(texts["certNoBtn"]) { _, _ -> latch.countDown() }
                .setOnCancelListener { latch.countDown() }
                .show()
        }
        latch.await()
        return yes
    }

    fun openExternal(url: String) {
        if (!url.startsWith("https://") && !url.startsWith("http://")) return
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (e: Exception) { /* no app to open it */ }
    }

    /** The status bar and the navigation bar take the page's colour (the page tells us). */
    fun setBars(bg: String, dark: Boolean) {
        val c = parseColor(bg) ?: return
        window.statusBarColor = c
        window.navigationBarColor = c
        val ctl = WindowInsetsControllerCompat(window, window.decorView)
        ctl.isAppearanceLightStatusBars = !dark
        ctl.isAppearanceLightNavigationBars = !dark
    }

    private fun parseColor(s: String): Int? = try {
        if (s.startsWith("#")) Color.parseColor(s) else Regex("(\\d+)").findAll(s).map { it.value.toInt() }.toList().let { Color.rgb(it[0], it[1], it[2]) }
    } catch (e: Exception) { null }

    // ---- the lock ----
    fun changeLock(on: Boolean) {
        lockEnabled = on
        runOnUiThread { applySecure() }
    }

    private fun applySecure() {
        // with the lock on, the app's picture is hidden in the recent apps list and cannot be captured
        if (lockEnabled) window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE) else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    private fun showLock() {
        applySecure()
        if (overlay == null) {
            val box = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setBackgroundColor(Color.parseColor("#14161C"))
                isClickable = true
                addView(TextView(context).apply { text = texts["lockTitle"]; setTextColor(Color.WHITE); textSize = 20f; gravity = Gravity.CENTER })
                addView(Button(context).apply { text = texts["lockRetry"]; setOnClickListener { askUnlock() } })
            }
            overlay = box
            root.addView(box, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
        overlay?.visibility = View.VISIBLE
        askUnlock()
    }

    private fun askUnlock() {
        lock.prompt(onOk = { overlay?.visibility = View.GONE; if (base.isNotEmpty() && currentUrl.isEmpty()) route() }, onFail = { })
    }

    override fun onPause() {
        super.onPause()
        pausedAt = System.currentTimeMillis()
    }

    override fun onResume() {
        super.onResume()
        applySecure()
        // coming back after the chosen time away asks again
        if (lockEnabled && pausedAt != 0L && System.currentTimeMillis() - pausedAt >= lockDelay * 1000L) showLock()
    }

    override fun onDestroy() {
        shell?.stop()
        super.onDestroy()
    }
}
