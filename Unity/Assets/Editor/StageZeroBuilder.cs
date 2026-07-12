using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class StageZeroBuilder
{
    private const string ScenePath = "Assets/Scenes/StageZero.unity";

    [MenuItem("Facelympic/0단계 장면 만들기")]
    public static void CreateScene()
    {
        PlayerSettings.companyName = "Facelympic";
        PlayerSettings.productName = "Facelympic3D";
        PlayerSettings.runInBackground = true;
        // 0단계는 Vercel 정적 호스팅에서 헤더 설정 없이 바로 검증하도록 무압축 빌드를 사용한다.
        // 기술 검증 통과 후 Brotli와 올바른 Content-Encoding 헤더를 함께 적용한다.
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.decompressionFallback = false;
        QualitySettings.SetQualityLevel(0, true);
        Application.targetFrameRate = 30;

        Directory.CreateDirectory("Assets/Scenes");
        Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var cameraObject = new GameObject("Main Camera");
        var camera = cameraObject.AddComponent<Camera>();
        cameraObject.tag = "MainCamera";
        cameraObject.transform.position = new Vector3(0f, 4.2f, -9f);
        cameraObject.transform.LookAt(new Vector3(0f, 1.1f, 7f));
        camera.backgroundColor = new Color(0.03f, 0.08f, 0.18f);
        camera.fieldOfView = 52f;
        var lightObject = new GameObject("Key Light");
        var light = lightObject.AddComponent<Light>();
        light.type = LightType.Directional; light.intensity = 1.25f;
        lightObject.transform.rotation = Quaternion.Euler(45f, -35f, 0f);

        CreateBlock("Track", new Vector3(0f, -0.2f, 9f), new Vector3(6.4f, 0.3f, 34f), new Color(0.12f, 0.18f, 0.3f));
        CreateBlock("Left Field", new Vector3(-5.7f, -0.25f, 9f), new Vector3(5f, 0.2f, 34f), new Color(0.08f, 0.32f, 0.18f));
        CreateBlock("Right Field", new Vector3(5.7f, -0.25f, 9f), new Vector3(5f, 0.2f, 34f), new Color(0.08f, 0.32f, 0.18f));
        for (int lane = -1; lane <= 1; lane += 2)
            CreateBlock("Lane Line", new Vector3(lane * 1.65f, 0f, 9f), new Vector3(0.07f, 0.025f, 34f), Color.white);
        CreateBlock("Finish Left", new Vector3(-3.2f, 1.5f, 21f), new Vector3(0.25f, 3.2f, 0.25f), Color.white);
        CreateBlock("Finish Right", new Vector3(3.2f, 1.5f, 21f), new Vector3(0.25f, 3.2f, 0.25f), Color.white);
        CreateBlock("Finish Top", new Vector3(0f, 3f, 21f), new Vector3(6.6f, 0.25f, 0.25f), new Color(1f, 0.78f, 0.18f));

        var runnerRoot = new GameObject("Runner Root");
        runnerRoot.transform.position = new Vector3(0f, 0f, -4f);
        var visual = new GameObject("Runner Visual");
        visual.transform.SetParent(runnerRoot.transform, false);
        CreatePrimitive("Body", PrimitiveType.Capsule, new Vector3(0f, 0.9f, 0f), new Vector3(0.75f, 0.9f, 0.75f), new Color(0.2f, 0.75f, 1f), visual.transform);
        CreatePrimitive("Head", PrimitiveType.Sphere, new Vector3(0f, 2f, 0f), new Vector3(0.82f, 0.82f, 0.82f), new Color(1f, 0.68f, 0.35f), visual.transform);
        CreatePrimitive("Left Eye", PrimitiveType.Sphere, new Vector3(-0.2f, 2.12f, -0.36f), Vector3.one * 0.12f, Color.black, visual.transform);
        CreatePrimitive("Right Eye", PrimitiveType.Sphere, new Vector3(0.2f, 2.12f, -0.36f), Vector3.one * 0.12f, Color.black, visual.transform);

        var receiverObject = new GameObject("FaceInputReceiver");
        receiverObject.AddComponent<FaceInputReceiver>().SetRunner(runnerRoot.transform, visual.transform);
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        Debug.Log("Facelympic 0단계 장면 생성 완료: " + ScenePath);
    }

    private static GameObject CreateBlock(string name, Vector3 position, Vector3 scale, Color color)
    {
        return CreatePrimitive(name, PrimitiveType.Cube, position, scale, color, null);
    }

    private static GameObject CreatePrimitive(string name, PrimitiveType type, Vector3 position, Vector3 scale, Color color, Transform parent)
    {
        var item = GameObject.CreatePrimitive(type);
        item.name = name;
        if (parent != null)
        {
            item.transform.SetParent(parent, false);
            item.transform.localPosition = position;
        }
        else item.transform.position = position;
        item.transform.localScale = scale;
        var material = new Material(Shader.Find("Standard")) { color = color };
        item.GetComponent<Renderer>().sharedMaterial = material;
        return item;
    }

    [MenuItem("Facelympic/WebGL 빌드")]
    public static void BuildWebGL()
    {
        if (!File.Exists(ScenePath)) CreateScene();
        string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../unity-web"));
        Directory.CreateDirectory(output);
        BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes = new[] { ScenePath }, locationPathName = output,
            target = BuildTarget.WebGL, options = BuildOptions.None
        });
    }
}
