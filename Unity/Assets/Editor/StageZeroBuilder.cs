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
        Directory.CreateDirectory("Assets/Scenes");
        Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var cameraObject = new GameObject("Main Camera");
        var camera = cameraObject.AddComponent<Camera>();
        cameraObject.tag = "MainCamera";
        cameraObject.transform.SetPositionAndRotation(new Vector3(0f, 2.2f, -6f), Quaternion.Euler(12f, 0f, 0f));
        camera.backgroundColor = new Color(0.04f, 0.07f, 0.11f);
        var lightObject = new GameObject("Key Light");
        var light = lightObject.AddComponent<Light>();
        light.type = LightType.Directional; light.intensity = 1.25f;
        lightObject.transform.rotation = Quaternion.Euler(45f, -35f, 0f);
        var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.name = "Smile Speed Cube"; cube.transform.position = new Vector3(0f, 0.8f, 0f);
        GameObject.CreatePrimitive(PrimitiveType.Plane).name = "Track Floor";
        var receiverObject = new GameObject("FaceInputReceiver");
        receiverObject.AddComponent<FaceInputReceiver>().SetRunnerCube(cube.transform);
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        Debug.Log("Facelympic 0단계 장면 생성 완료: " + ScenePath);
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
